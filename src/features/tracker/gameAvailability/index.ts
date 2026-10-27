import roster0 from "./red-blue.json";
import roster1 from "./yellow.json";
import roster2 from "./gold-silver.json";
import roster3 from "./crystal.json";
import roster4 from "./ruby-sapphire.json";
import roster5 from "./emerald.json";
import roster6 from "./firered-leafgreen.json";
import roster7 from "./diamond-pearl.json";
import roster8 from "./platinum.json";
import roster9 from "./heartgold-soulsilver.json";
import roster10 from "./black-white.json";
import roster11 from "./black-2-white-2.json";
import roster12 from "./x-y.json";
import roster13 from "./omega-ruby-alpha-sapphire.json";
import roster14 from "./sun-moon.json";
import roster15 from "./ultra-sun-ultra-moon.json";
import roster16 from "./lets-go-pikachu-lets-go-eevee.json";
import roster17 from "./sword-shield.json";
import roster18 from "./brilliant-diamond-shining-pearl.json";
import roster19 from "./legends-arceus.json";
import roster20 from "./scarlet-violet.json";
import roster21 from "./legends-za.json";
import species1 from "./species-1.json";
import species2 from "./species-2.json";
import species3 from "./species-3.json";
import species4 from "./species-4.json";
import collectionScopes from "./collectionScopes.json";

export const gameSpeciesNames: Record<string, string> = {
  ...species1,
  ...species2,
  ...species3,
  ...species4,
};
// Normal in-game acquisition only. Source and license: supabase/GAMESDEX.md.
export const obtainablePokemon: Record<string, readonly number[]> = {
  "red-blue": roster0,
  yellow: roster1,
  "gold-silver": roster2,
  crystal: roster3,
  "ruby-sapphire": roster4,
  emerald: roster5,
  "firered-leafgreen": roster6,
  "diamond-pearl": roster7,
  platinum: roster8,
  "heartgold-soulsilver": roster9,
  "black-white": roster10,
  "black-2-white-2": roster11,
  "x-y": roster12,
  "omega-ruby-alpha-sapphire": roster13,
  "sun-moon": roster14,
  "ultra-sun-ultra-moon": roster15,
  "lets-go-pikachu-lets-go-eevee": roster16,
  "sword-shield": roster17,
  "brilliant-diamond-shining-pearl": roster18,
  "legends-arceus": roster19,
  "scarlet-violet": roster20,
  "legends-za": roster21,
  ...collectionScopes,
};
