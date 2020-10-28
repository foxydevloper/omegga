const { color } = require('../util/');

class Player {
  #omegga = null;

  constructor(omegga, name, id, controller, state) {
    this.#omegga = omegga;
    this.name = name;
    this.id = id;
    this.controller = controller;
    this.state = state;
  }

  // clone the player
  clone() {
    return new Player(this.#omegga, this.name, this.id, this.controller, this.state);
  }

  // get raw player info (to feed into a constructor)
  raw() { return [this.name, this.id, this.controller, this.state]; }

  // true if the player is the host
  isHost() { return this.#omegga.host.id === this.id; }

  // clear this player's bricks
  clearBricks(quiet=false) { this.#omegga.clearBricks(this.id, quiet); }

  // get a player's roles, if any
  static getRoles(omegga, id) {
    const data = omegga.getRoleAssignments().savedPlayerRoles[id];
    return Object.freeze(data && data.roles ? data.roles : []);
  }

  // get a player's roles, if any
  getRoles() {
    return Player.getRoles(this.#omegga, this.id);
  }

  // get a player's permissions
  static getPermissions(omegga, id) {
    const { roles, defaultRole } = omegga.getRoleSetup();

    // if the player is the host, the player has every permission
    if (omegga.host.id === id) {
      return Object.freeze(Object.fromEntries(
        [].concat(
          defaultRole.permissions.map(p => [p.name, true]),
          // sometimes the default role does not have every permission listed
          ...roles.map(r => r.permissions.map(p => [p.name, true])),
        ),
      ));
    }

    const DEFAULT_PERMS = {
      moderator: [
        'Bricks.ClearAll',
        'Players.Kick',
        'Players.TPOthers',
        'Players.TPInMinigame',
        'Minigame.AlwaysLeave',
      ],
      admin: [
        'Bricks.Load',
        'Bricks.ClearOwn',
        'Bricks.ClearAll',
        'Bricks.IgnoreTrust',
        'Roles.Grant',
        'Map.Environment',
        'Players.Kick',
        'Players.Ban',
        'Players.TPOthers',
        'Players.TPInMinigame',
        'Minigame.AlwaysSwitchTeam',
        'Minigame.AlwaysLeave',
        'Minigame.AlwaysEdit',
        'Minigame.MakePersistent',
        'Minigame.MakeDefault',
        'Minigame.UseAllBricks',
        'Server.ChangeSettings',
        'Server.ChangeRoles',
        'Server.FreezeCamera',
        'Tools.Selector.BypassLimits',
        'Tools.Selector.BypassTimeouts',
      ],
    };

    // get the player's roles
    const playerRoles = Player.getRoles(omegga, id).map(r => r.toLowerCase());

    const permissions = {};
    // apply all permissions from default role
    for (const p of defaultRole.permissions)
      permissions[p.name] = p.bEnabled;

    // loop through all the roles
    for (const role of roles) {
      // ignore ones the player does not have
      if (!playerRoles.includes(role.name.toLowerCase()))
        continue;

      const defaultPerms = DEFAULT_PERMS[role.name.toLowerCase()] || [];
      // iterate through default permissions
      for (const perm of defaultPerms) {
        // if they are not overriden, set it to true
        if (!role.permissions.find(r => r.name === perm))
          permissions[perm] = true;
      }

      // add all the new permissions the player now has
      for (const p of role.permissions) {
        permissions[p.name] = permissions[p.name] || p.bEnabled;
      }
    }

    return Object.freeze(permissions);
  }

  // get a player's permissions
  getPermissions() {
    return Player.getPermissions(this.#omegga, this.id);
  }

  // get player's name color
  getNameColor() {
    const { roles, defaultRole, ownerRoleColor, bOwnerRoleHasColor } = this.#omegga.getRoleSetup();

    // host check if host has host color
    if (this.isHost() && bOwnerRoleHasColor)
      return color.rgbToHex(ownerRoleColor);

    // get the player's role
    const playerRoles = this.getRoles().map(r => r.toLowerCase());

    // only if the player actually has roles...
    if (playerRoles.length > 0) {
      // check the role list in reverse for the player's role (highest tier first)
      const found = roles.slice().reverse().find(role =>
        role.bHasColor && playerRoles.includes(role.name.toLowerCase()));

      if (found)
        return color.rgbToHex(found.color);
    }

    return color.rgbToHex(defaultRole.bHasColor ? defaultRole.color : {r: 255, g: 255, b: 255, a: 255});
  }

  // get player's position
  async getPosition() {
    // this is here because my text editor had weird syntax highlighting glitches when the other omeggas were replaced with this.#omegga...
    // guess the code is "too new" :egg:
    const omegga = this.#omegga;

    // given a player controller, match the player's pawn
    const pawnRegExp = new RegExp(`BP_PlayerController_C .+?PersistentLevel\\.${this.controller}\\.Pawn = BP_FigureV2_C'.+?:PersistentLevel.(?<pawn>BP_FigureV2_C_\\d+)'`);

    // wait for the pawn watcher to return a pawn
    const [{groups: { pawn }}] = await omegga.addWatcher(pawnRegExp, {
      // request the pawn for this player's controller (should only be one)
      exec: () =>  omegga.writeln(`GetAll BP_PlayerController_C Pawn Name=${this.controller}`),
    });

    // given a player's pawn, match the player's position
    const posRegExp = new RegExp(`CapsuleComponent .+?PersistentLevel\\.${pawn}\\.CollisionCylinder\\.RelativeLocation = \\(X=(?<x>[\\d\\.-]+),Y=(?<y>[\\d\\.-]+),Z=(?<z>[\\d\\.-]+)\\)`);

    // wait for the position promise
    const [{groups: { x, y, z }}] = await omegga.addWatcher(posRegExp, {
      // request the position for this player's pawn
      exec: () =>  omegga.writeln(`GetAll SceneComponent RelativeLocation Name=CollisionCylinder Outer=${pawn}`),
    });

    // return the player's position as an array of numbers
    return [x, y, z].map(Number);
  }
}

module.exports = Player;
