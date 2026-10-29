/**
 * The recipe library: weeknight family dinners Hats can suggest, plan, and shop for.
 * Each serves about four. `minutes` is start to table; slow-cooker recipes also say how long
 * they cook unattended. Pure data plus helpers, so it can be tested.
 */
import type { FoodArtId } from "./foodArt";

export type Aisle =
  | "Produce"
  | "Meat & fish"
  | "Dairy & eggs"
  | "Bakery"
  | "Pantry"
  | "Frozen"
  | "Spices & oils"
  | "Other";
export const AISLES: Aisle[] = [
  "Produce",
  "Meat & fish",
  "Dairy & eggs",
  "Bakery",
  "Pantry",
  "Frozen",
  "Spices & oils",
  "Other",
];

export type RecipeTag =
  | "quick"
  | "kid-friendly"
  | "vegetarian"
  | "one-pan"
  | "slow-cooker"
  | "make-ahead"
  | "freezer-friendly"
  | "low-effort";

export interface Ingredient {
  amount: string;
  item: string;
  aisle: Aisle;
}
export interface Recipe {
  id: string;
  name: string;
  blurb: string;
  minutes: number;
  /** Unattended cooking time, for slow-cooker dinners. */
  wait?: string;
  serves: number;
  art: FoodArtId;
  tint: string;
  tags: RecipeTag[];
  ingredients: Ingredient[];
  steps: string[];
  /** A real job kids can help with. */
  kids: string;
  tip?: string;
}

// Short helpers keep the list readable: i("1 lb", "ground turkey", "Meat & fish").
const i = (amount: string, item: string, aisle: Aisle): Ingredient => ({ amount, item, aisle });
const P: Aisle = "Produce";
const M: Aisle = "Meat & fish";
const D: Aisle = "Dairy & eggs";
const B: Aisle = "Bakery";
const N: Aisle = "Pantry";
const F: Aisle = "Frozen";
const SP: Aisle = "Spices & oils";

export const RECIPES: Recipe[] = [
  {
    id: "r-sheet-pan-fajitas",
    name: "Sheet-pan chicken fajitas",
    blurb: "Everything roasts on one pan; everyone builds their own.",
    minutes: 35,
    serves: 4,
    art: "sheetpan",
    tint: "#FFE6D3",
    tags: ["one-pan", "kid-friendly"],
    ingredients: [
      i("1½ lb", "chicken breasts", M),
      i("3", "bell peppers", P),
      i("1", "onion", P),
      i("2 tbsp", "olive oil", SP),
      i("1 tbsp", "fajita seasoning", SP),
      i("8", "flour tortillas", B),
      i("1 cup", "shredded cheese", D),
      i("½ cup", "sour cream", D),
      i("1", "lime", P),
    ],
    steps: [
      "Heat the oven to 425°F.",
      "Slice the chicken, peppers, and onion into strips. Toss on a sheet pan with the oil and seasoning.",
      "Roast 20–22 minutes, stirring once, until the chicken is cooked through (165°F).",
      "Squeeze lime over the pan. Warm the tortillas and set out the cheese and sour cream.",
    ],
    kids: "Tear the cheese bag open and set up the toppings line.",
    tip: "Leftovers make tomorrow’s quesadillas.",
  },
  {
    id: "r-turkey-tacos",
    name: "Taco night",
    blurb: "Seasoned ground turkey with a build-your-own toppings bar.",
    minutes: 25,
    serves: 4,
    art: "taco",
    tint: "#FFF3CC",
    tags: ["quick", "kid-friendly"],
    ingredients: [
      i("1 lb", "ground turkey", M),
      i("1 packet", "taco seasoning", SP),
      i("8", "taco shells", N),
      i("1 cup", "shredded cheese", D),
      i("1", "head of lettuce", P),
      i("2", "tomatoes", P),
      i("½ cup", "salsa", N),
      i("1 can", "black beans", N),
    ],
    steps: [
      "Brown the turkey in a skillet over medium-high, breaking it up, about 8 minutes.",
      "Stir in the seasoning and the water the packet calls for; simmer 5 minutes.",
      "Warm the beans and the shells while it simmers.",
      "Chop the lettuce and tomatoes and set everything out to build.",
    ],
    kids: "Rinse the lettuce and fill the topping bowls.",
  },
  {
    id: "r-bean-quesadillas",
    name: "Black bean quesadillas",
    blurb: "Crispy, cheesy, ready in 15. A lifesaver night.",
    minutes: 15,
    serves: 4,
    art: "wrap",
    tint: "#F3ECD8",
    tags: ["quick", "vegetarian", "kid-friendly", "low-effort"],
    ingredients: [
      i("8", "flour tortillas", B),
      i("1 can", "black beans", N),
      i("2 cups", "shredded cheese", D),
      i("1 cup", "frozen corn", F),
      i("½ cup", "salsa", N),
      i("½ cup", "sour cream", D),
    ],
    steps: [
      "Mash the drained beans with a fork; stir in the corn.",
      "Spread beans on half of each tortilla, add cheese, and fold.",
      "Cook in a dry skillet over medium, 2–3 minutes a side, until golden and melty.",
      "Cut into wedges. Serve with salsa and sour cream.",
    ],
    kids: "Mash the beans and sprinkle the cheese.",
  },
  {
    id: "r-tomato-pasta",
    name: "One-pot creamy tomato pasta",
    blurb: "Pasta cooks right in the sauce. One pot to wash.",
    minutes: 25,
    serves: 4,
    art: "pasta",
    tint: "#FCE1DE",
    tags: ["one-pan", "vegetarian", "kid-friendly", "quick"],
    ingredients: [
      i("1 lb", "short pasta", N),
      i("1 can (28 oz)", "crushed tomatoes", N),
      i("3 cups", "vegetable broth", N),
      i("3 cloves", "garlic", P),
      i("½ cup", "heavy cream", D),
      i("½ cup", "parmesan", D),
      i("2 handfuls", "baby spinach", P),
      i("1 tbsp", "olive oil", SP),
    ],
    steps: [
      "Warm the oil in a big pot and cook the sliced garlic 1 minute.",
      "Add the tomatoes, broth, and dry pasta. Bring to a boil.",
      "Simmer, stirring often, 12–14 minutes until the pasta is tender.",
      "Stir in the cream, parmesan, and spinach until it wilts.",
    ],
    kids: "Pull the spinach leaves off the stems and stir it in.",
  },
  {
    id: "r-meatballs",
    name: "Spaghetti and turkey meatballs",
    blurb: "Baked meatballs, simmered in sauce. Make a double batch.",
    minutes: 40,
    serves: 4,
    art: "pasta",
    tint: "#FCE1DE",
    tags: ["kid-friendly", "make-ahead", "freezer-friendly"],
    ingredients: [
      i("1 lb", "ground turkey", M),
      i("½ cup", "breadcrumbs", N),
      i("1", "egg", D),
      i("¼ cup", "parmesan", D),
      i("1 lb", "spaghetti", N),
      i("1 jar", "marinara sauce", N),
    ],
    steps: [
      "Heat the oven to 400°F. Mix the turkey, breadcrumbs, egg, and parmesan.",
      "Roll into 1½-inch balls and bake 18 minutes on a lined pan.",
      "Boil the spaghetti. Warm the marinara and add the meatballs to simmer 5 minutes.",
      "Serve the meatballs and sauce over the pasta.",
    ],
    kids: "Roll the meatballs (and wash hands well after).",
    tip: "Freeze extra baked meatballs flat; they reheat right in the sauce.",
  },
  {
    id: "r-baked-ziti",
    name: "Baked ziti",
    blurb: "Bubbling, cheesy, and better the next day.",
    minutes: 50,
    serves: 6,
    art: "pasta",
    tint: "#FCE1DE",
    tags: ["make-ahead", "freezer-friendly", "kid-friendly", "vegetarian"],
    ingredients: [
      i("1 lb", "ziti", N),
      i("1 jar", "marinara sauce", N),
      i("1 cup", "ricotta", D),
      i("2 cups", "shredded mozzarella", D),
      i("¼ cup", "parmesan", D),
      i("1 tsp", "Italian seasoning", SP),
    ],
    steps: [
      "Heat the oven to 375°F. Boil the ziti 2 minutes short of the package time.",
      "Mix the pasta with the marinara, ricotta, half the mozzarella, and the seasoning.",
      "Spread in a baking dish and top with the rest of the mozzarella and the parmesan.",
      "Bake 20–25 minutes until bubbling and golden.",
    ],
    kids: "Spread the cheese on top.",
    tip: "Assemble the night before; add 10 minutes if it goes in cold.",
  },
  {
    id: "r-naan-pizzas",
    name: "Naan pizzas",
    blurb: "Personal pizzas on naan. Everyone picks their toppings.",
    minutes: 20,
    serves: 4,
    art: "pizza",
    tint: "#FFF3CC",
    tags: ["quick", "kid-friendly", "vegetarian", "low-effort"],
    ingredients: [
      i("4", "naan breads", B),
      i("1 cup", "pizza sauce", N),
      i("2 cups", "shredded mozzarella", D),
      i("1 cup", "toppings you like", P),
    ],
    steps: [
      "Heat the oven to 425°F.",
      "Spread sauce on each naan, add cheese and toppings.",
      "Bake directly on the rack (pan underneath) 8–10 minutes until bubbly.",
      "Slice and serve with a bag salad.",
    ],
    kids: "Make their own pizza.",
  },
  {
    id: "r-chicken-noodle-soup",
    name: "Chicken noodle soup",
    blurb: "Cozy and quick with a rotisserie chicken.",
    minutes: 35,
    serves: 6,
    art: "soup",
    tint: "#FFE6D3",
    tags: ["make-ahead", "kid-friendly"],
    ingredients: [
      i("1", "rotisserie chicken", M),
      i("8 cups", "chicken broth", N),
      i("3", "carrots", P),
      i("3 stalks", "celery", P),
      i("1", "onion", P),
      i("3 cups", "egg noodles", N),
      i("1 tbsp", "olive oil", SP),
    ],
    steps: [
      "Dice the carrots, celery, and onion; soften in the oil in a big pot, 6 minutes.",
      "Add the broth and bring to a boil.",
      "Add the noodles and cook 7 minutes. Meanwhile shred the chicken.",
      "Stir in the chicken, season with salt and pepper, and serve.",
    ],
    kids: "Shred the cooled chicken with two forks.",
  },
  {
    id: "r-slow-cooker-chili",
    name: "Slow-cooker turkey chili",
    blurb: "Ten minutes in the morning, dinner waiting at night.",
    minutes: 20,
    wait: "6–8 hours on low",
    serves: 6,
    art: "soup",
    tint: "#FCE1DE",
    tags: ["slow-cooker", "make-ahead", "freezer-friendly", "low-effort"],
    ingredients: [
      i("1 lb", "ground turkey", M),
      i("1", "onion", P),
      i("1", "bell pepper", P),
      i("2 cans", "kidney beans", N),
      i("1 can (28 oz)", "diced tomatoes", N),
      i("2 tbsp", "chili powder", SP),
      i("1 tsp", "cumin", SP),
      i("1 cup", "shredded cheese", D),
    ],
    steps: [
      "Brown the turkey with the diced onion and pepper, about 8 minutes.",
      "Add it to the slow cooker with the drained beans, tomatoes, and spices.",
      "Cook on low 6–8 hours (or high 3–4).",
      "Serve topped with cheese.",
    ],
    kids: "Open the cans (with the safe opener) and dump them in.",
  },
  {
    id: "r-lentil-soup",
    name: "Lentil vegetable soup",
    blurb: "Hearty, cheap, and freezes beautifully.",
    minutes: 45,
    serves: 6,
    art: "soup",
    tint: "#FFE6D3",
    tags: ["vegetarian", "freezer-friendly", "make-ahead"],
    ingredients: [
      i("1½ cups", "brown lentils", N),
      i("8 cups", "vegetable broth", N),
      i("1 can", "diced tomatoes", N),
      i("2", "carrots", P),
      i("2 stalks", "celery", P),
      i("1", "onion", P),
      i("2 handfuls", "baby spinach", P),
      i("1 tsp", "cumin", SP),
      i("1 tbsp", "olive oil", SP),
    ],
    steps: [
      "Soften the diced onion, carrots, and celery in the oil, 6 minutes.",
      "Add the rinsed lentils, broth, tomatoes, and cumin.",
      "Simmer 30 minutes until the lentils are tender.",
      "Stir in the spinach. Season and serve with bread.",
    ],
    kids: "Rinse the lentils in a strainer.",
  },
  {
    id: "r-teriyaki-bowls",
    name: "Teriyaki chicken rice bowls",
    blurb: "Sticky, sweet, and better than takeout.",
    minutes: 30,
    serves: 4,
    art: "bowl",
    tint: "#D6F1EC",
    tags: ["kid-friendly"],
    ingredients: [
      i("1½ lb", "chicken thighs", M),
      i("½ cup", "teriyaki sauce", N),
      i("1½ cups", "rice", N),
      i("1 bag", "frozen broccoli", F),
      i("1", "cucumber", P),
      i("1 tsp", "sesame seeds", SP),
    ],
    steps: [
      "Start the rice.",
      "Cut the chicken into bites and brown in a skillet, 8 minutes, until cooked through.",
      "Add the teriyaki sauce and simmer until sticky, 2 minutes. Steam the broccoli.",
      "Build bowls: rice, chicken, broccoli, sliced cucumber, sesame seeds.",
    ],
    kids: "Sprinkle the sesame seeds and slice the cucumber with a kid knife.",
  },
  {
    id: "r-peanut-noodles",
    name: "Peanut noodles",
    blurb: "Creamy peanut sauce, crunchy veggies, 20 minutes.",
    minutes: 20,
    serves: 4,
    art: "noodles",
    tint: "#FFF3CC",
    tags: ["quick", "vegetarian"],
    ingredients: [
      i("12 oz", "spaghetti or rice noodles", N),
      i("⅓ cup", "peanut butter", N),
      i("3 tbsp", "soy sauce", N),
      i("1 tbsp", "honey", N),
      i("1", "lime", P),
      i("2", "carrots", P),
      i("1", "cucumber", P),
    ],
    steps: [
      "Cook the noodles.",
      "Whisk the peanut butter, soy sauce, honey, lime juice, and a splash of hot noodle water.",
      "Toss the drained noodles with the sauce.",
      "Top with shredded carrot and cucumber. Good warm or cold.",
    ],
    kids: "Whisk the sauce.",
    tip: "Allergy at the table? Swap in sunflower butter.",
  },
  {
    id: "r-fried-rice",
    name: "Veggie fried rice",
    blurb: "The best use of leftover rice there is.",
    minutes: 20,
    serves: 4,
    art: "bowl",
    tint: "#D6F1EC",
    tags: ["quick", "vegetarian", "low-effort", "one-pan"],
    ingredients: [
      i("4 cups", "cooked rice (day-old is best)", N),
      i("3", "eggs", D),
      i("1½ cups", "frozen peas and carrots", F),
      i("3", "green onions", P),
      i("3 tbsp", "soy sauce", N),
      i("2 tbsp", "vegetable oil", SP),
    ],
    steps: [
      "Heat the oil in a big skillet over high. Scramble the eggs, then push them aside.",
      "Add the peas and carrots, cook 2 minutes.",
      "Add the rice and press it into the pan; let it crisp, then stir. Repeat twice.",
      "Stir in the soy sauce and green onions.",
    ],
    kids: "Crack the eggs into a bowl.",
  },
  {
    id: "r-smash-burgers",
    name: "Smash burgers and oven fries",
    blurb: "Crispy-edged burgers on a weeknight.",
    minutes: 35,
    serves: 4,
    art: "burger",
    tint: "#FFE6D3",
    tags: ["kid-friendly"],
    ingredients: [
      i("1 lb", "ground beef", M),
      i("4", "burger buns", B),
      i("4 slices", "American cheese", D),
      i("1 bag", "frozen fries", F),
      i("1", "head of lettuce", P),
      i("1", "tomato", P),
    ],
    steps: [
      "Bake the fries as the bag says.",
      "Roll the beef into 8 loose balls. Heat a skillet very hot.",
      "Smash each ball flat with a spatula, salt it, cook 2 minutes, flip, add cheese, 1 more minute.",
      "Stack two patties per bun with lettuce and tomato.",
    ],
    kids: "Set out the buns and toppings; squeeze the ketchup.",
  },
  {
    id: "r-pancakes",
    name: "Breakfast for dinner",
    blurb: "Pancakes, eggs, and fruit. Always a hit.",
    minutes: 25,
    serves: 4,
    art: "pancakes",
    tint: "#FFF3CC",
    tags: ["kid-friendly", "vegetarian", "low-effort"],
    ingredients: [
      i("2 cups", "pancake mix", N),
      i("6", "eggs", D),
      i("1 cup", "milk", D),
      i("2 cups", "berries", P),
      i("", "maple syrup", N),
      i("2 tbsp", "butter", D),
    ],
    steps: [
      "Mix the pancake batter with the milk and an egg (or as the box says).",
      "Cook pancakes on a buttered griddle over medium, flipping when bubbles pop.",
      "Scramble the rest of the eggs low and slow.",
      "Serve with berries and syrup.",
    ],
    kids: "Stir the batter and wash the berries.",
  },
  {
    id: "r-frittata",
    name: "Veggie frittata",
    blurb: "Whatever’s in the fridge, baked into dinner.",
    minutes: 30,
    serves: 4,
    art: "skillet",
    tint: "#E6EAF1",
    tags: ["vegetarian", "one-pan", "low-effort"],
    ingredients: [
      i("10", "eggs", D),
      i("½ cup", "milk", D),
      i("1 cup", "shredded cheese", D),
      i("2 cups", "chopped vegetables", P),
      i("1 tbsp", "olive oil", SP),
      i("1 loaf", "crusty bread", B),
    ],
    steps: [
      "Heat the oven to 400°F. Soften the vegetables in the oil in an oven-safe skillet, 5 minutes.",
      "Whisk the eggs, milk, half the cheese, salt, and pepper; pour over the vegetables.",
      "Top with the rest of the cheese and cook 2 minutes on the stove.",
      "Bake 12–15 minutes until just set. Serve wedges with bread.",
    ],
    kids: "Whisk the eggs.",
  },
  {
    id: "r-drumsticks",
    name: "Crispy baked drumsticks",
    blurb: "Golden chicken legs with corn on the cob.",
    minutes: 50,
    serves: 4,
    art: "chicken",
    tint: "#FFE6D3",
    tags: ["kid-friendly", "low-effort"],
    ingredients: [
      i("8", "chicken drumsticks", M),
      i("2 tbsp", "olive oil", SP),
      i("2 tsp", "paprika", SP),
      i("1 tsp", "garlic powder", SP),
      i("4 ears", "corn", P),
      i("2 tbsp", "butter", D),
    ],
    steps: [
      "Heat the oven to 425°F. Pat the drumsticks dry.",
      "Toss with the oil, paprika, garlic powder, and salt on a rack or lined pan.",
      "Bake 40–45 minutes, turning once, until 175°F inside and crispy.",
      "Boil the corn 5 minutes and butter it.",
    ],
    kids: "Shuck the corn.",
  },
  {
    id: "r-salmon",
    name: "Lemon salmon and green beans",
    blurb: "One pan, 25 minutes, very little to clean.",
    minutes: 25,
    serves: 4,
    art: "fish",
    tint: "#FCE1DE",
    tags: ["quick", "one-pan"],
    ingredients: [
      i("4", "salmon fillets", M),
      i("1 lb", "green beans", P),
      i("1", "lemon", P),
      i("2 tbsp", "olive oil", SP),
      i("2 cloves", "garlic", P),
      i("1½ cups", "rice", N),
    ],
    steps: [
      "Heat the oven to 425°F and start the rice.",
      "Toss the green beans with half the oil and salt on a sheet pan; roast 8 minutes.",
      "Push them aside, add the salmon, brush with the rest of the oil, garlic, and lemon slices.",
      "Roast 10–12 minutes until the salmon flakes.",
    ],
    kids: "Snap the ends off the green beans.",
  },
  {
    id: "r-fish-tacos",
    name: "Crunchy fish tacos",
    blurb: "Crispy fish sticks, quick slaw, soft tortillas.",
    minutes: 25,
    serves: 4,
    art: "taco",
    tint: "#D6F1EC",
    tags: ["quick", "kid-friendly"],
    ingredients: [
      i("1 box", "frozen fish sticks", F),
      i("8", "small tortillas", B),
      i("1 bag", "coleslaw mix", P),
      i("⅓ cup", "mayonnaise", N),
      i("1", "lime", P),
      i("1", "avocado", P),
    ],
    steps: [
      "Bake the fish sticks as the box says.",
      "Stir the slaw with the mayo, lime juice, and a pinch of salt.",
      "Warm the tortillas.",
      "Fill each with fish, slaw, and avocado.",
    ],
    kids: "Squeeze the lime and stir the slaw.",
  },
  {
    id: "r-honey-garlic-chicken",
    name: "Honey-garlic chicken and rice",
    blurb: "Glossy, sweet-savory thighs everyone fights over.",
    minutes: 35,
    serves: 4,
    art: "chicken",
    tint: "#FFF3CC",
    tags: ["kid-friendly"],
    ingredients: [
      i("1½ lb", "chicken thighs", M),
      i("¼ cup", "honey", N),
      i("3 tbsp", "soy sauce", N),
      i("4 cloves", "garlic", P),
      i("1½ cups", "rice", N),
      i("1 bag", "frozen broccoli", F),
    ],
    steps: [
      "Start the rice.",
      "Season the chicken and brown in a skillet 5–6 minutes a side until 165°F.",
      "Add the minced garlic, honey, and soy sauce; simmer 2 minutes, turning to glaze.",
      "Serve over rice with steamed broccoli.",
    ],
    kids: "Measure the honey and soy sauce.",
  },
  {
    id: "r-caesar-wraps",
    name: "Chicken Caesar wraps",
    blurb: "No-cook dinner with a rotisserie chicken.",
    minutes: 15,
    serves: 4,
    art: "wrap",
    tint: "#E6F2E3",
    tags: ["quick", "low-effort"],
    ingredients: [
      i("1", "rotisserie chicken", M),
      i("2 hearts", "romaine", P),
      i("½ cup", "Caesar dressing", N),
      i("½ cup", "parmesan", D),
      i("4", "large tortillas", B),
      i("1 cup", "croutons", N),
    ],
    steps: [
      "Shred the chicken.",
      "Chop the romaine and toss with the dressing, parmesan, and crushed croutons.",
      "Add the chicken and roll it all up in the tortillas.",
      "Cut in half and serve with fruit.",
    ],
    kids: "Crush the croutons in a bag.",
  },
  {
    id: "r-grain-bowls",
    name: "Build-a-bowl night",
    blurb: "Rice, a protein, and every topping in the fridge.",
    minutes: 20,
    serves: 4,
    art: "bowl",
    tint: "#D6F1EC",
    tags: ["quick", "low-effort", "kid-friendly"],
    ingredients: [
      i("1½ cups", "rice", N),
      i("1", "rotisserie chicken", M),
      i("1 can", "black beans", N),
      i("1 cup", "frozen corn", F),
      i("1", "avocado", P),
      i("1 cup", "shredded cheese", D),
      i("½ cup", "salsa", N),
    ],
    steps: [
      "Start the rice. Warm the beans and corn.",
      "Shred the chicken and slice the avocado.",
      "Set everything out in bowls.",
      "Everyone builds their own.",
    ],
    kids: "Set out the bowls and spoons.",
  },
  {
    id: "r-sausage-sheet-pan",
    name: "Sausage, peppers, and potatoes",
    blurb: "A whole dinner from one hot pan.",
    minutes: 40,
    serves: 4,
    art: "sheetpan",
    tint: "#FCE1DE",
    tags: ["one-pan", "low-effort"],
    ingredients: [
      i("1 lb", "smoked sausage", M),
      i("1½ lb", "baby potatoes", P),
      i("2", "bell peppers", P),
      i("1", "onion", P),
      i("2 tbsp", "olive oil", SP),
      i("1 tsp", "Italian seasoning", SP),
    ],
    steps: [
      "Heat the oven to 425°F. Halve the potatoes and toss with half the oil on a pan; roast 15 minutes.",
      "Slice the sausage, peppers, and onion; toss with the rest of the oil and seasoning.",
      "Add to the pan and roast 15–20 minutes more until browned.",
      "Serve with mustard on the side.",
    ],
    kids: "Toss the veggies in the oil (clean hands!).",
  },
  {
    id: "r-beef-broccoli",
    name: "Beef and broccoli",
    blurb: "Takeout favorite, faster than delivery.",
    minutes: 25,
    serves: 4,
    art: "bowl",
    tint: "#E6EAF1",
    tags: ["quick"],
    ingredients: [
      i("1 lb", "flank steak", M),
      i("4 cups", "broccoli florets", P),
      i("⅓ cup", "soy sauce", N),
      i("2 tbsp", "brown sugar", N),
      i("1 tbsp", "cornstarch", N),
      i("2 cloves", "garlic", P),
      i("1½ cups", "rice", N),
      i("1 tbsp", "vegetable oil", SP),
    ],
    steps: [
      "Start the rice. Slice the steak thin against the grain.",
      "Whisk the soy sauce, sugar, cornstarch, garlic, and ½ cup water.",
      "Sear the beef in the oil over high in batches, 2 minutes; set aside. Cook the broccoli 3 minutes with a splash of water.",
      "Return the beef, add the sauce, and stir until glossy.",
    ],
    kids: "Whisk the sauce.",
  },
  {
    id: "r-mac-and-cheese",
    name: "Stovetop mac and cheese with peas",
    blurb: "Creamy from-scratch mac in the time the box takes.",
    minutes: 20,
    serves: 4,
    art: "pasta",
    tint: "#FFF3CC",
    tags: ["quick", "kid-friendly", "vegetarian"],
    ingredients: [
      i("1 lb", "elbow macaroni", N),
      i("2 cups", "shredded cheddar", D),
      i("1 cup", "milk", D),
      i("2 tbsp", "butter", D),
      i("1 cup", "frozen peas", F),
    ],
    steps: [
      "Boil the macaroni; add the peas for the last 2 minutes. Drain.",
      "Back in the pot over low, add the butter and milk.",
      "Stir in the cheese a handful at a time until smooth.",
      "Season with salt and pepper.",
    ],
    kids: "Add the cheese a handful at a time.",
  },
  {
    id: "r-pesto-pasta",
    name: "Pesto chicken pasta",
    blurb: "Bright, green, and on the table in 25.",
    minutes: 25,
    serves: 4,
    art: "pasta",
    tint: "#E6F2E3",
    tags: ["quick"],
    ingredients: [
      i("1 lb", "penne", N),
      i("1 jar", "pesto", N),
      i("1", "rotisserie chicken", M),
      i("1 pint", "cherry tomatoes", P),
      i("¼ cup", "parmesan", D),
    ],
    steps: [
      "Boil the pasta, saving a cup of the water.",
      "Shred the chicken and halve the tomatoes.",
      "Toss the pasta with the pesto, chicken, tomatoes, and a splash of pasta water.",
      "Top with parmesan.",
    ],
    kids: "Halve the tomatoes with a kid knife.",
  },
  {
    id: "r-shepherds-pie",
    name: "Shepherd’s pie",
    blurb: "Savory filling under a blanket of mashed potatoes.",
    minutes: 55,
    serves: 6,
    art: "skillet",
    tint: "#F3ECD8",
    tags: ["make-ahead", "freezer-friendly", "kid-friendly"],
    ingredients: [
      i("1 lb", "ground beef", M),
      i("1", "onion", P),
      i("2 cups", "frozen mixed vegetables", F),
      i("1 cup", "beef broth", N),
      i("2 tbsp", "tomato paste", N),
      i("2½ lb", "potatoes", P),
      i("½ cup", "milk", D),
      i("3 tbsp", "butter", D),
    ],
    steps: [
      "Boil the peeled, cut potatoes until tender, 15 minutes; mash with the milk and butter.",
      "Heat the oven to 400°F. Brown the beef and onion; stir in the tomato paste, broth, and vegetables. Simmer 5 minutes.",
      "Spread the filling in a baking dish and top with the potatoes.",
      "Bake 20 minutes until golden on top.",
    ],
    kids: "Mash the potatoes.",
  },
  {
    id: "r-taco-soup",
    name: "Taco soup",
    blurb: "Taco night in a bowl, all in one pot.",
    minutes: 30,
    serves: 6,
    art: "soup",
    tint: "#FFF3CC",
    tags: ["one-pan", "freezer-friendly", "kid-friendly"],
    ingredients: [
      i("1 lb", "ground beef", M),
      i("1", "onion", P),
      i("1 packet", "taco seasoning", SP),
      i("2 cans", "pinto beans", N),
      i("1 can", "diced tomatoes", N),
      i("1 cup", "frozen corn", F),
      i("3 cups", "beef broth", N),
      i("1 bag", "tortilla chips", N),
    ],
    steps: [
      "Brown the beef with the diced onion in a big pot.",
      "Add the seasoning, beans, tomatoes, corn, and broth.",
      "Simmer 15 minutes.",
      "Serve with crushed chips and cheese on top.",
    ],
    kids: "Crush the chips for the topping.",
  },
  {
    id: "r-grilled-cheese",
    name: "Grilled cheese and tomato soup",
    blurb: "The coziest low-effort dinner there is.",
    minutes: 20,
    serves: 4,
    art: "soup",
    tint: "#FCE1DE",
    tags: ["quick", "vegetarian", "kid-friendly", "low-effort"],
    ingredients: [
      i("8 slices", "bread", B),
      i("8 slices", "cheddar", D),
      i("3 tbsp", "butter", D),
      i("2 cartons", "tomato soup", N),
    ],
    steps: [
      "Warm the soup in a pot.",
      "Butter the outsides of the bread and build sandwiches with the cheese.",
      "Cook in a skillet over medium-low, 3–4 minutes a side, until golden.",
      "Cut into strips for dunking.",
    ],
    kids: "Build the sandwiches.",
  },
  {
    id: "r-cobb-salad",
    name: "Big salad night",
    blurb: "A loaded Cobb that eats like a meal.",
    minutes: 20,
    serves: 4,
    art: "salad",
    tint: "#E6F2E3",
    tags: ["quick", "low-effort"],
    ingredients: [
      i("2 heads", "romaine", P),
      i("1", "rotisserie chicken", M),
      i("4", "eggs", D),
      i("6 slices", "bacon", M),
      i("1", "avocado", P),
      i("1 pint", "cherry tomatoes", P),
      i("½ cup", "ranch dressing", N),
    ],
    steps: [
      "Hard-boil the eggs, 10 minutes, then cool in cold water.",
      "Cook the bacon until crisp and crumble it.",
      "Chop the lettuce; slice the chicken, eggs, avocado, and tomatoes.",
      "Arrange in rows on the lettuce. Dressing on the side.",
    ],
    kids: "Peel the eggs.",
  },
  {
    id: "r-pulled-pork",
    name: "Slow-cooker pulled pork sliders",
    blurb: "Set it in the morning, shred it at dinner.",
    minutes: 15,
    wait: "8 hours on low",
    serves: 8,
    art: "burger",
    tint: "#F3ECD8",
    tags: ["slow-cooker", "make-ahead", "freezer-friendly", "kid-friendly"],
    ingredients: [
      i("3 lb", "pork shoulder", M),
      i("1 cup", "barbecue sauce", N),
      i("1", "onion", P),
      i("12", "slider buns", B),
      i("1 bag", "coleslaw mix", P),
    ],
    steps: [
      "Put the sliced onion in the slow cooker, the pork on top, and half the sauce over it.",
      "Cook on low 8 hours.",
      "Shred with two forks and stir in the rest of the sauce.",
      "Pile onto buns with slaw.",
    ],
    kids: "Shred the pork with forks once it cools a bit.",
  },
  {
    id: "r-greek-pitas",
    name: "Greek chicken pitas",
    blurb: "Lemony chicken, cucumber, and creamy sauce.",
    minutes: 30,
    serves: 4,
    art: "wrap",
    tint: "#DCE9FA",
    tags: ["kid-friendly"],
    ingredients: [
      i("1½ lb", "chicken breasts", M),
      i("1", "lemon", P),
      i("1 tsp", "oregano", SP),
      i("4", "pita breads", B),
      i("1", "cucumber", P),
      i("1 cup", "plain Greek yogurt", D),
      i("1", "tomato", P),
      i("1 tbsp", "olive oil", SP),
    ],
    steps: [
      "Toss the chicken with the oil, lemon juice, oregano, and salt.",
      "Cook in a skillet 6 minutes a side until 165°F; rest, then slice.",
      "Grate half the cucumber into the yogurt with a pinch of salt for the sauce.",
      "Fill warm pitas with chicken, sauce, tomato, and the rest of the cucumber.",
    ],
    kids: "Stir the yogurt sauce.",
  },
];

/** Items nearly every kitchen has; they never land on the grocery list by themselves. */
export const STAPLES = ["salt", "pepper", "olive oil", "vegetable oil", "water"];

export const recipeById = (id: string | undefined) =>
  id ? RECIPES.find((r) => r.id === id) : undefined;

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const singular = (w: string) => w.replace(/(ies)$/, "y").replace(/(oes|ches|shes)$/, (m) => m.slice(0, -2)).replace(/s$/, "");

const key = (s: string) => norm(s).split(" ").map(singular).join(" ");
/**
 * Whether two grocery names mean the same thing: "Eggs" and "egg", "baby spinach" and
 * "spinach", "shredded cheese" and "cheese". The shorter name has to be the longer one's last
 * words, so "garlic" doesn't count as "garlic powder".
 */
export function sameItem(a: string, b: string) {
  const x = key(a);
  const y = key(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length < y.length ? [x, y] : [y, x];
  return short.length >= 3 && long.endsWith(` ${short}`);
}

const KEYWORDS: [RegExp, Aisle][] = [
  [/\b(apple|banana|berr|grape|orange|lemon|lime|lettuce|romaine|spinach|kale|tomato|potato|onion|garlic|carrot|celery|pepper|cucumber|avocado|broccoli|corn on|mushroom|zucchini|squash|herb|cilantro|parsley|basil|fruit|vegetable|salad|slaw|green bean|pear|peach|melon)/i, "Produce"],
  [/\b(chicken|turkey|beef|pork|steak|sausage|bacon|ham|salmon|fish|shrimp|tuna|meat)/i, "Meat & fish"],
  [/\b(milk|egg|cheese|cheddar|mozzarella|parmesan|ricotta|yogurt|butter|cream|sour cream)/i, "Dairy & eggs"],
  [/\b(bread|bun|bagel|tortilla|pita|naan|roll|muffin)/i, "Bakery"],
  [/\b(frozen|ice cream|fries|fish sticks|waffle)/i, "Frozen"],
  [/\b(salt|pepper flakes|spice|seasoning|cumin|paprika|oregano|cinnamon|oil|vinegar|chili powder)/i, "Spices & oils"],
  [/\b(rice|pasta|noodle|spaghetti|macaroni|penne|ziti|bean|lentil|broth|stock|soup|sauce|salsa|can|cereal|oat|flour|sugar|honey|syrup|peanut butter|jam|chip|cracker|snack|coffee|tea|mix)/i, "Pantry"],
];
const LIB_AISLE = new Map<string, Aisle>(
  RECIPES.flatMap((r) => r.ingredients.map((x) => [norm(x.item), x.aisle] as const)),
);
/** Which part of the store an item is in, so the list follows your walk through it. */
export function aisleFor(item: string): Aisle {
  const known = LIB_AISLE.get(norm(item));
  if (known) return known;
  return KEYWORDS.find(([re]) => re.test(item))?.[1] ?? "Other";
}

/** A grocery list sorted into aisles, in store order. */
export function byAisle(items: string[]) {
  const groups = new Map<Aisle, string[]>();
  for (const it of items) {
    const a = aisleFor(it);
    groups.set(a, [...(groups.get(a) ?? []), it]);
  }
  return AISLES.filter((a) => groups.has(a)).map((a) => ({ aisle: a, items: groups.get(a)! }));
}

export const isStaple = (item: string) => STAPLES.some((s) => key(s) === key(item));

export const TAG_LABEL: Record<RecipeTag, string> = {
  quick: "Quick",
  "kid-friendly": "Kid-friendly",
  vegetarian: "Vegetarian",
  "one-pan": "One pan",
  "slow-cooker": "Slow cooker",
  "make-ahead": "Make ahead",
  "freezer-friendly": "Freezes well",
  "low-effort": "Low effort",
};

const LEAD = /^(?:some|more|a|an|the|fresh|extra)\s+/i;
/**
 * Groceries said out loud: "we need milk and eggs", "add bananas to the grocery list",
 * "out of coffee", "grocery list: bread, apples". Returns the items, or null when it sounds
 * like a to-do instead ("buy a birthday gift" isn't groceries).
 */
export function groceryItems(text: string): string[] | null {
  const t = text.trim().replace(/[.!]+$/, "");
  const listed = t.match(/^(?:grocery|shopping)\s+list[:,]?\s+(.+)$/i);
  const toList = t.match(/^(?:please\s+)?(?:add|put)\s+(.+?)\s+(?:to|on)\s+(?:the\s+|my\s+|our\s+)?(?:grocery|shopping)(?:\s+list)?$/i);
  const need = t.match(/^(?:we\s+need|we(?:'|’)?re\s+out\s+of|we\s+are\s+out\s+of|out\s+of|need\s+to\s+buy|buy|pick\s+up|grab)\s+(.+)$/i);
  const body = listed?.[1] ?? toList?.[1] ?? need?.[1];
  if (!body) return null;
  const items = body
    .split(/,|\s+and\s+|\s*&\s*|\s+plus\s+/i)
    .map((x) => x.trim().replace(LEAD, "").replace(LEAD, "").trim())
    .filter(Boolean);
  if (!items.length) return null;
  // "Grocery list: …" and "add … to the grocery list" are clear; "buy …" only counts for food.
  if (listed || toList) return items;
  return items.every((x) => aisleFor(x) !== "Other") ? items : null;
}
