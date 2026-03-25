// All available P2 mind map icon names (from extracted assets)
export const ICON_NAMES = [
  "abbatoir","aglaya","ammo","bacteria","barricade","beer","bell","bigdevice",
  "birdmask_01","birdmask_02","birdmask_03","blood","boat","bottle_01",
  "bottle_inverted","bottleempty","bottlefull","brain","brain_inverted",
  "braintwo","braintwo_inverted","bread","brickwall","bride","bull_01",
  "bull_02","bull_03","camp_01","cap","cards","chains","clerks_01","clock",
  "coins","coinshand","crack_01","crack_02","crack_03",
  "dagger","dice_01","doorcross","dvoedushnik","eye","eyelock","factory",
  "fingerprint","fire","fist","footprint","gasmask","gears","gesture_01",
  "gesture_02","gesture_03","grave","grave_01","grave_02","grave_03","grif",
  "gun","hammer","handshake_01","handshake_02","handshake_03","heart_01",
  "heart_02","heart_03","heart_04","herbs","house_01","iron_heart",
  "justice_01","kapella","key_01","keylock","keystring","khan","kidney",
  "kidney_inverted","kids_01","kneel","knife","knot","lara","laska",
  "letter","lips","liver","liver_inverted","lock","locomotive","man",
  "medicine_01","mishka","molotov","moon","mortar","needle","noose",
  "notkin","odong","odong_1","olgimsky","ospina_01","ospina_02","paperone",
  "papertwo","pills","polyhedron","psiglavez","purse","quarantine_01",
  "rat_01","rat_02","revolver","rifle","root_01","rubin","saburov",
  "sad_woman","sad_woman2","sad_woman3","scalpel","shabnak","skullbones",
  "sky","snakes","sobor_01","soldier","spichka","stairway","stairway2",
  "tavro_01","tavro_02","tavro_03","taya","teeth","theatre","time_01",
  "tincan","torch","tragic","train","tunnel","vial","water","wheel_01",
  "window_01","withachild","woman",
] as const;

export type IconName = typeof ICON_NAMES[number];

export function iconUrl(name: string, variant: "white" | "black" = "white") {
  return `/icons-${variant}/${name}.png`;
}
