// PORTAL DETAILS TOOLS //////////////////////////////////////////////
// hand any of these functions the details-hash of a portal, and they
// will return useful, but raw data.

// returns a float. Displayed portal level is always rounded down from
// that value.
window.getPortalLevel = function(d) {
  var lvl = 0;
  var hasReso = false;
  $.each(d.resonators, function(ind, reso) {
    if(!reso) return true;
    lvl += parseInt(reso.level);
    hasReso = true;
  });
  return hasReso ? Math.max(1, lvl/8) : 0;
}

window.getTotalPortalEnergy = function(d) {
  var nrg = 0;
  $.each(d.resonators, function(ind, reso) {
    if(!reso) return true;
    var level = parseInt(reso.level);
    var max = RESO_NRG[level];
    nrg += max;
  });
  return nrg;
}

// For backwards compatibility
window.getPortalEnergy = window.getTotalPortalEnergy;

window.getCurrentPortalEnergy = function(d) {
  var nrg = 0;
  $.each(d.resonators, function(ind, reso) {
    if(!reso) return true;
    nrg += parseInt(reso.energy);
  });
  return nrg;
}

window.getPortalRange = function(d) {
  // formula by the great gals and guys at
  // http://decodeingress.me/2012/11/18/ingress-portal-levels-and-link-range/
  var range = {
    base: window.teamStringToId(d.team) === window.TEAM_MAC ? window.LINK_RANGE_MAC[d.level + 1] : 160 * Math.pow(window.getPortalLevel(d), 4),
    boost: window.getLinkAmpRangeBoost(d),
  };

  range.range = range.boost * range.base;
  range.isLinkable = d.resCount === 8;

  return range;
}

window.getLinkAmpRangeBoost = function(d) {
  if (window.teamStringToId(d.team) === window.TEAM_MAC) {
    return 1.0;
  }
  // additional range boost calculation

  // link amps scale: first is full, second a quarter, the last two an eighth
  var scale = [1.0, 0.25, 0.125, 0.125];

  var boost = 0.0;  // initial boost is 0.0 (i.e. no boost over standard range)

  var linkAmps = getPortalModsByType(d, 'LINK_AMPLIFIER');

  linkAmps.forEach(function(mod, i) {
    // link amp stat LINK_RANGE_MULTIPLIER is 2000 for rare, and gives 2x boost to the range
    // and very-rare is 7000 and gives 7x the range
    var baseMultiplier = mod.stats.LINK_RANGE_MULTIPLIER/1000;
    boost += baseMultiplier*scale[i];
  });

  return (linkAmps.length > 0) ? boost : 1.0;
}


window.getAttackApGain = function(d,fieldCount,linkCount) {
  if (!fieldCount) fieldCount = 0;

  var resoCount = 0;
  var maxResonators = MAX_RESO_PER_PLAYER.slice(0);
  var curResonators = [ 0, 0, 0, 0, 0, 0, 0, 0, 0];

  for(var n = PLAYER.level + 1; n < 9; n++) {
    maxResonators[n] = 0;
  }
  $.each(d.resonators, function(ind, reso) {
    if(!reso)
      return true;
    resoCount += 1;
    var reslevel=parseInt(reso.level);
    if(reso.owner === PLAYER.nickname) {
      if(maxResonators[reslevel] > 0) {
        maxResonators[reslevel] -= 1;
      }
    } else {
      curResonators[reslevel] += 1;
    }
  });


  var resoAp = resoCount * DESTROY_RESONATOR;
  var linkAp = linkCount * DESTROY_LINK;
  var fieldAp = fieldCount * DESTROY_FIELD;
  var destroyAp = resoAp + linkAp + fieldAp;
  var captureAp = CAPTURE_PORTAL + 8 * DEPLOY_RESONATOR + COMPLETION_BONUS;
  var enemyAp = destroyAp + captureAp;
  var deployCount = 8 - resoCount;
  var completionAp = (deployCount > 0) ? COMPLETION_BONUS : 0;
  var upgradeCount = 0;
  var upgradeAvailable = maxResonators[8];
  for(var n = 7; n >= 0; n--) {
    upgradeCount += curResonators[n];
    if(upgradeAvailable < upgradeCount) {
        upgradeCount -= (upgradeCount - upgradeAvailable);
    }
    upgradeAvailable += maxResonators[n];
  }
  var friendlyAp = deployCount * DEPLOY_RESONATOR + upgradeCount * UPGRADE_ANOTHERS_RESONATOR + completionAp;
  return {
    friendlyAp: friendlyAp,
    deployCount: deployCount,
    upgradeCount: upgradeCount,
    enemyAp: enemyAp,
    destroyAp: destroyAp,
    resoAp: resoAp,
    captureAp: captureAp
  };
}

//This function will return the potential level a player can upgrade it to
window.potentialPortalLevel = function(d) {
  var current_level = getPortalLevel(d);
  var potential_level = current_level;

  if(PLAYER.team === d.team) {
    var resonators_on_portal = d.resonators;
    var resonator_levels = new Array();
    // figure out how many of each of these resonators can be placed by the player
    var player_resontators = new Array();
    for(var i=1;i<=MAX_PORTAL_LEVEL; i++) {
      player_resontators[i] = i > PLAYER.level ? 0 : MAX_RESO_PER_PLAYER[i];
    }
    $.each(resonators_on_portal, function(ind, reso) {
      if(reso !== null && reso.owner === window.PLAYER.nickname) {
        player_resontators[reso.level]--;
      }
      resonator_levels.push(reso === null ? 0 : reso.level);
    });

    resonator_levels.sort(function(a, b) {
      return(a - b);
    });

    // Max out portal
    var install_index = 0;
    for(var i=MAX_PORTAL_LEVEL;i>=1; i--) {
      for(var install = player_resontators[i]; install>0; install--) {
        if(resonator_levels[install_index] < i) {
          resonator_levels[install_index] = i;
          install_index++;
        }
      }
    }
    //log.log(resonator_levels);
    potential_level = resonator_levels.reduce(function(a, b) {return a + b;}) / 8;
  }
  return(potential_level);
}


window.fixPortalImageUrl = function(url) {
  if (url) {
    if (window.location.protocol === 'https:') {
      url = url.replace(/^http:\/\//, '//');
    }
    return url;
  } else {
    return DEFAULT_PORTAL_IMG;
  }

}


window.getPortalModsByType = function(d, type) {
  var mods = [];

  var typeToStat = {
    RES_SHIELD: 'MITIGATION',
    FORCE_AMP: 'FORCE_AMPLIFIER',
    TURRET: 'HIT_BONUS',  // and/or ATTACK_FREQUENCY??
    HEATSINK: 'HACK_SPEED',
    MULTIHACK: 'BURNOUT_INSULATION',
    LINK_AMPLIFIER: 'LINK_RANGE_MULTIPLIER',
    ULTRA_LINK_AMP: 'OUTGOING_LINKS_BONUS', // and/or LINK_DEFENSE_BOOST??
  };

  var stat = typeToStat[type];

  $.each(d.mods || [], function(i,mod) {
    if (mod && mod.stats.hasOwnProperty(stat)) mods.push(mod);
  });


  // sorting mods by the stat keeps code simpler, when calculating combined mod effects
  mods.sort (function(a,b) {
    return b.stats[stat] - a.stats[stat];
  });

  return mods;
}



window.getPortalShieldMitigation = function(d) {
  var shields = getPortalModsByType(d, 'RES_SHIELD');

  var mitigation = 0;
  $.each(shields, function(i,s) {
    mitigation += parseInt(s.stats.MITIGATION);
  });

  return mitigation;
}

window.getPortalLinkDefenseBoost = function(d) {
  var ultraLinkAmps = getPortalModsByType(d, 'ULTRA_LINK_AMP');

  var linkDefenseBoost = 1;

  $.each(ultraLinkAmps, function (index, ultraLinkAmp) {
    linkDefenseBoost *= parseInt(ultraLinkAmp.stats.LINK_DEFENSE_BOOST) / 1000;
  });

  return Math.round(10 * linkDefenseBoost) / 10;
}

window.getPortalLinksMitigation = function(linkCount) {
  var mitigation = Math.round(400/9*Math.atan(linkCount/Math.E));
  return mitigation;
}

window.getPortalMitigationDetails = function(d,linkCount) {
  var linkDefenseBoost = getPortalLinkDefenseBoost(d);

  var mitigation = {
    shields: getPortalShieldMitigation(d),
    links: getPortalLinksMitigation(linkCount) * linkDefenseBoost,
    linkDefenseBoost: linkDefenseBoost
  };

  // mitigation is limited to 95% (as confirmed by Brandon Badger on G+)
  mitigation.total = Math.min(95, mitigation.shields+mitigation.links);

  var excess = (mitigation.shields+mitigation.links) - mitigation.total;
  mitigation.excess = Math.round(10 * excess) / 10;

  return mitigation;
}

window.getMaxOutgoingLinks = function(d) {
  var linkAmps = getPortalModsByType(d, 'ULTRA_LINK_AMP');

  var links = 8;

  linkAmps.forEach(function(mod, i) {
    links += parseInt(mod.stats.OUTGOING_LINKS_BONUS);
  });

  return links;
};

window.getPortalHackDetails = function(d) {

  var heatsinks = getPortalModsByType(d, 'HEATSINK');
  var multihacks = getPortalModsByType(d, 'MULTIHACK');

  // first mod of type is fully effective, the others are only 50% effective
  var effectivenessReduction = [ 1, 0.5, 0.5, 0.5 ];

  var cooldownTime = BASE_HACK_COOLDOWN;

  $.each(heatsinks, function(index,mod) {
    var hackSpeed = parseInt(mod.stats.HACK_SPEED)/1000000;
    cooldownTime = Math.round(cooldownTime * (1 - hackSpeed * effectivenessReduction[index]));
  });

  var hackCount = BASE_HACK_COUNT; // default hacks

  $.each(multihacks, function(index,mod) {
    var extraHacks = parseInt(mod.stats.BURNOUT_INSULATION);
    hackCount = hackCount + (extraHacks * effectivenessReduction[index]);
  });

  return {cooldown: cooldownTime, hacks: hackCount, burnout: cooldownTime*(hackCount-1)};
}

// given a detailed portal structure, return summary portal data, as seen in the map tile data
window.getPortalSummaryData = function(d) {

  // NOTE: the summary data reports unclaimed portals as level 1 - not zero as elsewhere in IITC
  var level = parseInt(getPortalLevel(d));
  if (level == 0) level = 1; //niantic returns neutral portals as level 1, not 0 as used throughout IITC elsewhere

  var resCount = 0;
  if (d.resonators) {
    for (var x in d.resonators) {
      if (d.resonators[x]) resCount++;
    }
  }
  var maxEnergy = getTotalPortalEnergy(d);
  var curEnergy = getCurrentPortalEnergy(d);
  var health = maxEnergy>0 ? parseInt(curEnergy/maxEnergy*100) : 0;

  return {
    level: level,
    title: d.title,
    image: d.image,
    resCount: resCount,
    latE6: d.latE6,
    health: health,
    team: d.team,
    lngE6: d.lngE6,
    type: 'portal'
  };
}

window.getPortalAttackValues = function(d) {
  var forceamps = getPortalModsByType(d, 'FORCE_AMP');
  var turrets = getPortalModsByType(d, 'TURRET');

  // at the time of writing, only rare force amps and turrets have been seen in the wild, so there's a little guesswork
  // at how the stats work and combine
  // algorithm has been compied from getLinkAmpRangeBoost
  // FIXME: only extract stats and put the calculation in a method to be used for link range, force amplifier and attack
  // frequency
  // note: scanner shows rounded values (adding a second FA shows: 2.5x+0.2x=2.8x, which should be 2.5x+0.25x=2.75x)

  // amplifier scale: first is full, second a quarter, the last two an eighth
  var scale = [1.0, 0.25, 0.125, 0.125];

  var attackValues = {
    hit_bonus: 0,
    force_amplifier: 0,
    attack_frequency: 0,
  };

  forceamps.forEach(function(mod, i) {
    // force amp stat FORCE_AMPLIFIER is 2000 for rare, and gives 2x boost to the range
    var baseMultiplier = mod.stats.FORCE_AMPLIFIER / 1000;
    attackValues.force_amplifier += baseMultiplier * scale[i];
  });

  turrets.forEach(function(mod, i) {
    // turret stat ATTACK_FREQUENCY is 2000 for rare, and gives 2x boost to the range
    var baseMultiplier = mod.stats.ATTACK_FREQUENCY / 1000;
    attackValues.attack_frequency += baseMultiplier * scale[i];

    attackValues.hit_bonus += mod.stats.HIT_BONUS / 10000;
  });

  return attackValues;
}


