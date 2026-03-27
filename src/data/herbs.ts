import type { Tile, ContainerTile, TextTile, RasterTile, VectorTile } from '@/types/tile';

/**
 * Culinary herbs demo data — 5 levels deep.
 *
 * Level 0: Root grid — index of herb categories
 * Level 1: Herb category — individual herbs in that category
 * Level 2: Individual herb — details, recipes, pairings
 * Level 3: Recipe or pairing detail — ingredients, steps
 * Level 4: Deepest level — specific notes, tips, variations
 */

// ─── SVG icons for herbs (simple leaf/herb vector graphics) ───────────────────

const basil_svg = `<path d="M12 2C8 2 4 6 4 10c0 3 2 5.5 4 7l1 1h6l1-1c2-1.5 4-4 4-7 0-4-4-8-8-8zm0 2c3.3 0 6 2.7 6 6 0 2.2-1.3 4.1-3 5.4V18h-6v-2.6C7.3 14.1 6 12.2 6 10c0-3.3 2.7-6 6-6z" fill="currentColor"/>`;

const rosemary_svg = `<path d="M12 2L9 7l-5 2 3 4-1 5 6-2 6 2-1-5 3-4-5-2-3-5z" fill="currentColor"/>`;

const thyme_svg = `<path d="M12 3c-2 0-4 1-5 3s-1 4 0 6c1 1 2 2 3 2v6h4v-6c1 0 2-1 3-2 1-2 1-4 0-6s-3-3-5-3z" fill="currentColor"/>`;

const mint_svg = `<path d="M12 2c-4 0-7 3-7 7 0 2 1 4 2 5l1 1v5h8v-5l1-1c1-1 2-3 2-5 0-4-3-7-7-7zm-2 8c-1 0-2-1-2-2s1-2 2-2 2 1 2 2-1 2-2 2z" fill="currentColor"/>`;

const cilantro_svg = `<path d="M12 2c-1 0-3 1-4 3L6 8l-2 2c0 2 1 4 3 5h2v5h6v-5h2c2-1 3-3 3-5l-2-2-2-3c-1-2-3-3-4-3z" fill="currentColor"/>`;

// ─── Level 4: Deepest — tips, variations, notes ──────────────────────────────

const pestoPineTip: TextTile = {
  id: 'pesto-pine-tip',
  type: 'text',
  level: 4,
  position: { row: 0, col: 0, width: 89, height: 144 },
  parentId: 'pesto-ingredients',
  content: {
    heading: 'Pine Nuts',
    body: 'Toast at 350F for 5-7 min until golden. Watch closely — they burn quickly. Can substitute with walnuts or cashews for a budget-friendly version.',
  },
};

const pestoOilTip: TextTile = {
  id: 'pesto-oil-tip',
  type: 'text',
  level: 4,
  position: { row: 0, col: 1, width: 144, height: 144 },
  parentId: 'pesto-ingredients',
  content: {
    heading: 'Olive Oil',
    body: 'Use high-quality extra virgin olive oil. Add gradually while blending for the smoothest emulsion. About 1/2 cup for 2 cups of packed basil.',
  },
};

const pestoVariation: TextTile = {
  id: 'pesto-variation',
  type: 'text',
  level: 4,
  position: { row: 0, col: 2, width: 233, height: 144 },
  parentId: 'pesto-ingredients',
  content: {
    heading: 'Variations',
    body: 'Sun-dried tomato pesto: add 1/2 cup sun-dried tomatoes. Lemon pesto: add zest of 2 lemons. Arugula pesto: replace half the basil with arugula for a peppery kick.',
  },
};

const pestoServingTip: TextTile = {
  id: 'pesto-serving',
  type: 'text',
  level: 4,
  position: { row: 1, col: 0, width: 89, height: 233 },
  parentId: 'pesto-ingredients',
  content: {
    heading: 'Serving',
    body: 'Toss with hot pasta immediately. Reserve 1/2 cup pasta water to loosen. Never heat pesto directly — it dulls the color and flavor.',
  },
};

const pestoStorageTip: TextTile = {
  id: 'pesto-storage',
  type: 'text',
  level: 4,
  position: { row: 2, col: 0, width: 144, height: 144 },
  parentId: 'pesto-ingredients',
  content: {
    heading: 'Storage',
    body: 'Freeze in ice cube trays for portioned servings. Top with thin layer of oil before refrigerating to prevent browning. Keeps 1 week in fridge, 3 months frozen.',
  },
};

// ─── Level 3: Recipes & pairing details ──────────────────────────────────────

const pestoIngredients: ContainerTile = {
  id: 'pesto-ingredients',
  type: 'container',
  level: 3,
  position: { row: 0, col: 2, width: 233, height: 144 },
  parentId: 'basil-pesto',
  label: 'Ingredients & Tips',
  children: [pestoPineTip, pestoOilTip, pestoVariation, pestoServingTip, pestoStorageTip],
};

const pestoMethod: TextTile = {
  id: 'pesto-method',
  type: 'text',
  level: 3,
  position: { row: 0, col: 0, width: 89, height: 144 },
  parentId: 'basil-pesto',
  content: {
    heading: 'Method',
    body: '1. Pulse pine nuts & garlic in food processor\n2. Add basil leaves, pulse to chop\n3. Stream in olive oil while running\n4. Stir in Parmesan and season to taste',
  },
};

const pestoOverview: TextTile = {
  id: 'pesto-overview',
  type: 'text',
  level: 3,
  position: { row: 1, col: 0, width: 144, height: 233 },
  parentId: 'basil-pesto',
  content: {
    heading: 'Classic Pesto',
    body: 'A Genovese classic. The key is fresh basil — never dried. Use a food processor, not a blender, for the right texture.',
    fontSize: 14,
  },
};

const pestoHistory: TextTile = {
  id: 'pesto-history',
  type: 'text',
  level: 3,
  position: { row: 0, col: 1, width: 144, height: 144 },
  parentId: 'basil-pesto',
  content: {
    heading: 'Origins',
    body: 'From Genoa, Liguria. The name comes from "pestare" — to pound or crush. Traditional mortar-and-pestle preparation predates food processors by centuries.',
  },
};

// Rosemary recipe details (level 3)
const lambMethod: TextTile = {
  id: 'lamb-method',
  type: 'text',
  level: 3,
  position: { row: 0, col: 0, width: 89, height: 144 },
  parentId: 'rosemary-lamb',
  content: {
    heading: 'Preparation',
    body: '1. Score lamb leg in diamond pattern\n2. Insert rosemary sprigs and garlic slivers\n3. Rub with olive oil, salt, pepper\n4. Roast 20 min/lb at 325F',
  },
};

const lambPairings: TextTile = {
  id: 'lamb-pairings',
  type: 'text',
  level: 3,
  position: { row: 0, col: 1, width: 144, height: 144 },
  parentId: 'rosemary-lamb',
  content: {
    heading: 'Pairings',
    body: 'Serve with roasted root vegetables, mint sauce, and a full-bodied red wine. Rosemary potatoes are the classic side.',
  },
};

const lambNotes: TextTile = {
  id: 'lamb-notes',
  type: 'text',
  level: 3,
  position: { row: 1, col: 0, width: 233, height: 233 },
  parentId: 'rosemary-lamb',
  content: {
    heading: 'Chef Notes',
    body: 'Rosemary is one of the most robust herbs — it can withstand long cooking times without losing flavor. Strip leaves from woody stems and chop finely for even distribution.',
  },
};

// ─── Level 2: Individual herbs — details, recipes ────────────────────────────

const basilPesto: ContainerTile = {
  id: 'basil-pesto',
  type: 'container',
  level: 2,
  position: { row: 0, col: 2, width: 233, height: 144 },
  parentId: 'basil',
  label: 'Classic Pesto Genovese',
  children: [pestoMethod, pestoHistory, pestoIngredients, pestoOverview],
};

const basilOverview: TextTile = {
  id: 'basil-overview',
  type: 'text',
  level: 2,
  position: { row: 1, col: 2, width: 233, height: 233 },
  parentId: 'basil',
  content: {
    heading: 'Sweet Basil',
    body: 'Ocimum basilicum. The king of herbs in Italian cooking. Over 60 varieties exist worldwide, from Thai basil to purple opal. Best used fresh — add at the end of cooking to preserve flavor and color.',
    fontSize: 14,
  },
};

const basilIcon: RasterTile = {
  id: 'basil-icon',
  type: 'raster',
  level: 2,
  position: { row: 0, col: 0, width: 89, height: 144 },
  parentId: 'basil',
  content: {
    src: '/images/basil.png',
    alt: 'Fresh basil leaves',
  },
};

const basilPairings: TextTile = {
  id: 'basil-pairings',
  type: 'text',
  level: 2,
  position: { row: 0, col: 1, width: 144, height: 144 },
  parentId: 'basil',
  content: {
    heading: 'Pairings',
    body: 'Tomato, mozzarella, garlic, olive oil, pine nuts, lemon, oregano, Parmesan. Classic: Caprese salad, Margherita pizza, Thai basil stir-fry.',
  },
};

const basilGrowing: TextTile = {
  id: 'basil-growing',
  type: 'text',
  level: 2,
  position: { row: 2, col: 0, width: 144, height: 144 },
  parentId: 'basil',
  content: {
    heading: 'Growing',
    body: 'Full sun, well-drained soil. Pinch flower buds to extend leaf harvest. Sensitive to cold — bring indoors below 50F.',
  },
};

// Rosemary level 2
const rosemaryLamb: ContainerTile = {
  id: 'rosemary-lamb',
  type: 'container',
  level: 2,
  position: { row: 0, col: 2, width: 233, height: 144 },
  parentId: 'rosemary',
  label: 'Rosemary Roast Lamb',
  children: [lambMethod, lambPairings, lambNotes],
};

const rosemaryOverview: TextTile = {
  id: 'rosemary-overview',
  type: 'text',
  level: 2,
  position: { row: 1, col: 2, width: 233, height: 233 },
  parentId: 'rosemary',
  content: {
    heading: 'Rosemary',
    body: 'Salvia rosmarinus. A Mediterranean native with needle-like leaves and a woodsy, peppery flavor. One of the most versatile culinary herbs — pairs with meats, breads, and even cocktails.',
    fontSize: 14,
  },
};

const rosemaryIcon: RasterTile = {
  id: 'rosemary-icon',
  type: 'raster',
  level: 2,
  position: { row: 0, col: 0, width: 89, height: 144 },
  parentId: 'rosemary',
  content: {
    src: '/images/rosemary.png',
    alt: 'Fresh rosemary sprigs',
  },
};

const rosemaryUses: TextTile = {
  id: 'rosemary-uses',
  type: 'text',
  level: 2,
  position: { row: 0, col: 1, width: 144, height: 144 },
  parentId: 'rosemary',
  content: {
    heading: 'Uses',
    body: 'Roasted meats, focaccia, potatoes, stews, infused oils. Rosemary lemonade and gin cocktails. Excellent for grilling — use stems as skewers.',
  },
};

// Thyme level 2
const thymeOverview: TextTile = {
  id: 'thyme-overview',
  type: 'text',
  level: 2,
  position: { row: 1, col: 2, width: 233, height: 233 },
  parentId: 'thyme',
  content: {
    heading: 'Thyme',
    body: 'Thymus vulgaris. A staple of French cuisine and bouquet garni. Earthy, slightly minty flavor that intensifies when dried. Over 350 species — lemon thyme and common thyme are most popular in cooking.',
    fontSize: 14,
  },
};

const thymeIcon: RasterTile = {
  id: 'thyme-icon',
  type: 'raster',
  level: 2,
  position: { row: 0, col: 0, width: 89, height: 144 },
  parentId: 'thyme',
  content: {
    src: '/images/thyme.png',
    alt: 'Fresh thyme sprigs',
  },
};

const thymeUses: TextTile = {
  id: 'thyme-uses',
  type: 'text',
  level: 2,
  position: { row: 0, col: 1, width: 144, height: 144 },
  parentId: 'thyme',
  content: {
    heading: 'Uses',
    body: 'Soups, stews, roasted vegetables, poultry. Essential in bouquet garni and herbes de Provence. Lemon thyme is excellent with fish and in teas.',
  },
};

const thymePairings: TextTile = {
  id: 'thyme-pairings',
  type: 'text',
  level: 2,
  position: { row: 0, col: 2, width: 233, height: 144 },
  parentId: 'thyme',
  content: {
    heading: 'Pairings',
    body: 'Bay leaf, rosemary, sage, garlic, onion, mushrooms, tomatoes, beans. Classic French combination with parsley and bay leaf in bouquet garni.',
  },
};

// ─── Level 1: Herb categories ────────────────────────────────────────────────

const basil: ContainerTile = {
  id: 'basil',
  type: 'container',
  level: 1,
  position: { row: 1, col: 2, width: 233, height: 233 },
  parentId: 'root',
  label: 'Basil',
  children: [basilIcon, basilPairings, basilPesto, basilOverview, basilGrowing],
};

const rosemary: ContainerTile = {
  id: 'rosemary',
  type: 'container',
  level: 1,
  position: { row: 0, col: 2, width: 233, height: 144 },
  parentId: 'root',
  label: 'Rosemary',
  children: [rosemaryIcon, rosemaryUses, rosemaryLamb, rosemaryOverview],
};

const thyme: ContainerTile = {
  id: 'thyme',
  type: 'container',
  level: 1,
  position: { row: 0, col: 1, width: 144, height: 144 },
  parentId: 'root',
  label: 'Thyme',
  children: [thymeIcon, thymeUses, thymePairings, thymeOverview],
};

const mintInfo: TextTile = {
  id: 'mint-info',
  type: 'text',
  level: 1,
  position: { row: 2, col: 2, width: 233, height: 144 },
  parentId: 'root',
  content: {
    heading: 'Mint',
    body: 'Mentha. A vigorous grower found in cuisines worldwide — from mojitos to lamb dishes to Vietnamese pho. Over 20 species including spearmint and peppermint.',
  },
};

const cilantroInfo: TextTile = {
  id: 'cilantro-info',
  type: 'text',
  level: 1,
  position: { row: 2, col: 3, width: 144, height: 144 },
  parentId: 'root',
  content: {
    heading: 'Cilantro',
    body: 'Coriandrum sativum. Used in Mexican, Thai, Indian, and Middle Eastern cuisines. Divisive flavor — genetically, some taste soap. Seeds (coriander) have a different, warm profile.',
  },
};

const herbTitle: TextTile = {
  id: 'herb-title',
  type: 'text',
  level: 1,
  position: { row: 0, col: 0, width: 89, height: 144 },
  parentId: 'root',
  content: {
    heading: 'Culinary Herbs',
    body: 'An index of essential herbs, their uses, and recipes',
    fontSize: 12,
  },
};

const mintIcon: RasterTile = {
  id: 'mint-icon',
  type: 'raster',
  level: 1,
  position: { row: 1, col: 0, width: 89, height: 233 },
  parentId: 'root',
  content: {
    src: '/images/mint.png',
    alt: 'Fresh mint leaves',
  },
};

const cilantroIcon: RasterTile = {
  id: 'cilantro-icon',
  type: 'raster',
  level: 1,
  position: { row: 2, col: 4, width: 89, height: 144 },
  parentId: 'root',
  content: {
    src: '/images/cilantro.png',
    alt: 'Fresh cilantro leaves',
  },
};

const herbConnections: TextTile = {
  id: 'herb-connections',
  type: 'text',
  level: 1,
  position: { row: 1, col: 1, width: 144, height: 233 },
  parentId: 'root',
  content: {
    heading: 'Connections',
    body: 'Herbs form flavor families. Mediterranean herbs (rosemary, thyme, oregano) complement each other. Asian herbs (Thai basil, cilantro, mint) form another cluster. Understanding these connections is key to intuitive cooking.',
    fontSize: 11,
  },
};

const herbSeasons: TextTile = {
  id: 'herb-seasons',
  type: 'text',
  level: 1,
  position: { row: 0, col: 3, width: 144, height: 144 },
  parentId: 'root',
  content: {
    heading: 'Seasonality',
    body: 'Most herbs peak in summer. Rosemary and thyme are evergreen perennials. Basil and cilantro are warm-season annuals. Mint spreads aggressively year-round.',
  },
};

const herbStorage: TextTile = {
  id: 'herb-storage',
  type: 'text',
  level: 1,
  position: { row: 0, col: 4, width: 89, height: 144 },
  parentId: 'root',
  content: {
    heading: 'Storage',
    body: 'Stand in water like flowers. Wrap in damp paper towels. Freeze in olive oil in ice cube trays.',
    fontSize: 10,
  },
};

const herbDrying: TextTile = {
  id: 'herb-drying',
  type: 'text',
  level: 1,
  position: { row: 2, col: 0, width: 89, height: 144 },
  parentId: 'root',
  content: {
    heading: 'Drying',
    body: 'Hang upside down in bundles. Oven at 180F for 2-4 hours. Use 1/3 the amount when substituting dried for fresh.',
    fontSize: 10,
  },
};

const herbMediterranean: TextTile = {
  id: 'herb-mediterranean',
  type: 'text',
  level: 1,
  position: { row: 2, col: 1, width: 144, height: 144 },
  parentId: 'root',
  content: {
    heading: 'Mediterranean Family',
    body: 'Rosemary, thyme, oregano, sage, and marjoram share a warm, aromatic profile. They thrive in similar conditions and appear together in Italian, Greek, and French cuisines.',
  },
};

// ─── Level 0: Root grid ──────────────────────────────────────────────────────

export const rootTiles: Tile[] = [
  herbTitle,
  thyme,
  rosemary,
  herbSeasons,
  herbStorage,
  mintIcon,
  herbConnections,
  basil,
  herbDrying,
  herbMediterranean,
  mintInfo,
  cilantroInfo,
  cilantroIcon,
];

/**
 * Flat lookup map of all tiles by ID for O(1) access.
 */
function buildTileMap(tiles: Tile[]): Map<string, Tile> {
  const map = new Map<string, Tile>();

  function walk(tile: Tile) {
    map.set(tile.id, tile);
    if (tile.type === 'container') {
      tile.children.forEach(walk);
    }
  }

  tiles.forEach(walk);
  return map;
}

export const tileMap = buildTileMap(rootTiles);

/**
 * Get the ancestry chain from root to a given tile ID.
 */
export function getAncestryChain(tileId: string): string[] {
  const chain: string[] = [];
  let current = tileMap.get(tileId);

  while (current) {
    chain.unshift(current.id);
    if (current.parentId) {
      current = tileMap.get(current.parentId);
    } else {
      break;
    }
  }

  return chain;
}
