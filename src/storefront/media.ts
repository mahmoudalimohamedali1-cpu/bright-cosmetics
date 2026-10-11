/*
  Lifestyle photography. Free-to-use images hot-linked from Unsplash
  (Unsplash License). Provenance per image is the Unsplash photo id in the
  URL. Replace with Bright's own shoot before launch.
*/

const u = (id: string, w: number, h?: number) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=72&w=${w}${h ? `&h=${h}` : ''}`

export type Photo = { id: string; alt: { ar: string; en: string }; src: (w: number, h?: number) => string }

const photo = (id: string, ar: string, en: string): Photo => ({ id, alt: { ar, en }, src: (w, h) => u(id, w, h) })

export const PHOTOS = {
  /** Hero: laughing, hands on her cheeks, bright green ground */
  hero: photo('1713370572362-35983645f6a7', 'بنت بتضحك وإيديها على خدودها', 'A woman laughing with her hands on her cheeks'),
  /** Wide banner: joyful, white space on one side */
  banner: photo('1728727267814-792db55ce678', 'بنت مبسوطة ولمسة كريم على خدها', 'A smiling woman with a touch of cream on her cheek'),
  /** Accordion / why-Bright image */
  serum: photo('1655026392641-bf283a5f12d4', 'نقطة سيروم من القطّارة على الجبهة', 'A drop of serum from a glass dropper'),
  /** Texture, glass and water */
  glass: photo('1580491934306-acf5f6886d90', 'وش ورا إزاز عليه نقط مية', 'A face behind a glass with water drops'),
  texture: photo('1694147185194-f91cd8a50680', 'دوامات جل وكريم وسيروم', 'Swirls of gel, cream and serum'),
  centellaHand: photo('1770717984650-21665d4362b9', 'إيد ماسكة تونر سنتيلا', 'A hand holding a centella toner'),
  serumsPink: photo('1741896135490-4062a3b21abf', 'سيرومات على خلفية بينك', 'Serums on a pink ground'),
  amber: photo('1608571423902-eed4a5ad8108', 'قزازة قطّارة كهرماني وضل ورق شجر', 'An amber dropper bottle in palm shade'),
  dropper: photo('1573461160327-b450ce3d8e7f', 'قطّارة سيروم فوق الإيد', 'A serum dropper over a hand'),
  /** "Seen in the wild" strip */
  wild: [
    photo('1602144564445-159e5e5bae55', 'بنت بتضحك وبتحط كريم تحت عينها', 'A smiling woman dabbing cream under her eye'),
    photo('1548382131-e0ebb1f0cdea', 'بنت بتضحك في الشمس', 'A woman laughing in the sun'),
    photo('1670201203208-055d6d79db4a', 'سيروم على الخد بضوافر بينك', 'Serum applied with pink nails'),
    photo('1728727242233-0924178c1fb1', 'بنت بفستان أبيض بتضحك ولامسة وشها', 'A woman in white smiling and touching her face'),
    photo('1581182815808-b6eb627a8798', 'بورتريه بلمعة على الوش', 'A portrait with glitter on the face'),
    photo('1581182800629-7d90925ad072', 'بنت عينيها مقفولة وبشرتها منوّرة', 'A woman with eyes closed and glowing skin'),
    photo('1728727217834-b190862837a3', 'بنت بتضحك ولامسة وشها', 'A woman smiling and touching her face'),
  ],
}
