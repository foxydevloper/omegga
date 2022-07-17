import { OmeggaPlayer } from '@/plugin';
import { MatchGenerator } from './types';

// LogChat: Brickadia Player changed the server settings.
// Use \w instead of . so that it doesn't match actual player chat, which has a colon.
const serverSettingsChangedRegExp =
  /^(?<name>\w+) changed the server settings\.$/;

const serverSettingsChanged: MatchGenerator<{
  whoChanged: OmeggaPlayer;
}> = omegga => {
  return {
    // listen for commands messages
    pattern(_line, logMatch) {
      // line is not generic console log
      if (!logMatch) return;

      const { generator, data } = logMatch.groups;
      // check if log is a chat log
      if (generator !== 'LogChat') return;

      // match the log to the map change finish pattern
      const matchChange = data.match(serverSettingsChangedRegExp);
      if (matchChange) {
        const { name } = matchChange.groups;

        const player = omegga.players.find(p => p.name === name);

        return {
          whoChanged: player,
        };
      }

      return null;
    },
    // when there's a match, emit the event
    callback(result) {
      omegga.emit('serversettingschanged', result);
    },
  };
};

export default serverSettingsChanged;
