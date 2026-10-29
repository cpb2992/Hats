import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Share,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { addDays, dayShort, fromISO } from "../engine/dates";
import { Icon } from "../ui/icons";
import { planWeek } from "../personal/auto";
import { Food, Hat } from "../personal/Hat";
import { haptic } from "../personal/haptics";
import {
  asMeal,
  dinnerFor,
  isGoTo,
  nextDinner,
  planDinner,
  suggestRecipes,
  weekDinners,
  type MealFilter,
} from "../personal/meals";
import { RecipeFlipCard, timeLabel } from "../personal/RecipeCard";
import { byAisle, recipeById, sameItem, type Recipe } from "../personal/recipes";
import { usePersonal } from "../personal/Store";
import {
  Button,
  Chip,
  Header,
  P,
  Page,
  Panel,
  Row,
  Section,
  T,
  sticker,
} from "../personal/ui";

const FILTERS: { key: MealFilter; label: string }[] = [
  { key: "all", label: "All ideas" },
  { key: "pantry", label: "Use what I have" },
  { key: "quick", label: "Quick" },
  { key: "kid-friendly", label: "Kid-friendly" },
  { key: "low-effort", label: "Low effort" },
  { key: "vegetarian", label: "Vegetarian" },
  { key: "one-pan", label: "One pan" },
  { key: "slow-cooker", label: "Slow cooker" },
  { key: "make-ahead", label: "Make ahead" },
];

const dayLabel = (date: string, today: string) =>
  date === today ? "Tonight" : date === addDays(today, 1) ? "Tomorrow" : `${dayShort(date)} ${fromISO(date).getDate()}`;

export default function Meals() {
  const { data, today, mutate, say } = usePersonal();
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState<MealFilter>("all");
  const [at, setAt] = useState(0);
  const [picking, setPicking] = useState(false);
  const [item, setItem] = useState("");
  const [staple, setStaple] = useState("");
  const [kitchenOpen, setKitchenOpen] = useState(false);
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const deck = useMemo(() => suggestRecipes(data, today, filter, 12), [data, today, filter]);
  const current: Recipe | undefined = deck[Math.min(at, deck.length - 1)];
  const cardW = Math.min(width, 560) - 72;
  const step = cardW + 12;
  const plan7 = weekDinners(data, week);
  const tonight = plan7[0];
  const tonightRecipe = recipeById(tonight.meal?.id);
  const open = (id: string) => router.push({ pathname: "/recipe/[id]", params: { id } });

  const plan = (date: string, id: string, name: string) => {
    let added: string[] = [];
    mutate((d) => {
      added = planDinner(d, date, id);
    });
    haptic("success");
    setPicking(false);
    say(
      `${dayLabel(date, today)}: ${name}${added.length ? ` · ${added.length} ${added.length === 1 ? "thing" : "things"} added to groceries` : ""}`,
    );
  };
  const swap = (date: string) => {
    const exclude = [
      data.dinners[date],
      ...week.map((d) => data.dinners[d]),
      dinnerFor(data, date).meal?.id,
    ].filter(Boolean) as string[];
    const next = nextDinner(data, date, exclude);
    if (!next) return say("No other dinners to swap in yet.");
    plan(date, next.id, next.name);
  };
  const unplanned = week.filter((d) => !data.dinners[d]);
  const shareList = async () => {
    const text = byAisle(data.groceries)
      .map((g) => `${g.aisle}\n${g.items.map((x) => `• ${x}`).join("\n")}`)
      .join("\n\n");
    try {
      await Share.share({ message: `Groceries\n\n${text}` });
    } catch {
      say("Couldn’t open sharing on this phone.");
    }
  };
  const addItem = () => {
    const name = item.trim();
    if (!name) return;
    if (data.groceries.some((g) => sameItem(g, name))) {
      setItem("");
      return say(`${name} is already on the list.`);
    }
    mutate((d) => {
      d.groceries.push(name);
    });
    setItem("");
    haptic("tap");
  };

  return (
    <Page tabs={false}>
      <Header
        title="Dinner’s handled."
        subtitle="Flip through ideas, plan the week, and the list builds itself."
        hat="chef"
        back
      />

      {/* Tonight */}
      {tonight.meal ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${tonight.planned ? "Tonight" : "Idea for tonight"}: ${tonight.meal.name}. Open the recipe.`}
          onPress={() => open(tonight.meal!.id)}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            padding: 16,
            borderRadius: 26,
            backgroundColor: P.ink,
            ...sticker(pressed ? 3 : 5),
            transform: [{ translateY: pressed ? 2 : 0 }],
          })}
        >
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 42,
              backgroundColor: tonightRecipe?.tint ?? "#FFF0C2",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Food id={tonightRecipe?.art ?? "plate"} size={64} tilt={-6} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <T size={11} bold color={P.sun}>
              {tonight.planned ? "TONIGHT" : "IDEA FOR TONIGHT"}
            </T>
            <T display size={21} color={P.paper} numberOfLines={2}>
              {tonight.meal.name}
            </T>
            <T size={12} color="#C8D7EA">
              {tonightRecipe ? timeLabel(tonightRecipe) : `${tonight.meal.minutes} min`} · Tap for the recipe
            </T>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
              {!tonight.planned ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => plan(today, tonight.meal!.id, tonight.meal!.name)}
                  style={{ paddingHorizontal: 12, minHeight: 36, borderRadius: 12, backgroundColor: P.sun, justifyContent: "center" }}
                >
                  <T size={13} bold>
                    Make this tonight
                  </T>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Swap tonight’s dinner"
                onPress={() => swap(today)}
                style={{ paddingHorizontal: 12, minHeight: 36, borderRadius: 12, backgroundColor: "#2E4366", justifyContent: "center" }}
              >
                <T size={13} bold color={P.paper}>
                  Swap
                </T>
              </Pressable>
            </View>
          </View>
        </Pressable>
      ) : null}

      {/* The deck */}
      <Section hat="chef" title="Recipe cards" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -20 }}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      >
        {FILTERS.map((f) => (
          <Chip
            key={f.key}
            title={f.label}
            selected={filter === f.key}
            onPress={() => {
              setFilter(f.key);
              setAt(0);
              setPicking(false);
            }}
          />
        ))}
      </ScrollView>
      {deck.length ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={step}
            decelerationRate="fast"
            disableIntervalMomentum
            style={{ marginHorizontal: -20 }}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 6 }}
            onScroll={(e) => {
              const n = Math.round(e.nativeEvent.contentOffset.x / step);
              if (n !== at) {
                setAt(n);
                setPicking(false);
              }
            }}
            scrollEventThrottle={32}
            accessibilityLabel="Recipe cards. Swipe left or right for more."
          >
            {deck.map((r) => (
              <RecipeFlipCard key={r.id} r={r} data={data} width={cardW} />
            ))}
          </ScrollView>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 6 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {deck.map((r, n) => (
              <View
                key={r.id}
                style={{
                  width: n === at ? 18 : 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: n === at ? P.ink : "#D9CBB4",
                }}
              />
            ))}
          </View>
          {current ? (
            <View style={{ gap: 10 }}>
              <Row>
                <Button
                  title={picking ? "Pick a night" : "Plan it"}
                  small
                  icon="calendar"
                  onPress={() => setPicking(!picking)}
                />
                <Button
                  title={isGoTo(data, current.id) ? "♥ Go-to" : "♡ Make it a go-to"}
                  small
                  quiet
                  onPress={() => {
                    const was = isGoTo(data, current.id);
                    mutate((d) => {
                      if (was) d.meals = d.meals.filter((m) => m.id !== current.id);
                      else d.meals.push({ ...asMeal(current), favorite: true });
                    });
                    haptic("tap");
                    say(was ? `${current.name} is just an idea again.` : `${current.name} is a go-to now.`);
                  }}
                />
                <Button
                  title="Not for us"
                  small
                  quiet
                  onPress={() => {
                    mutate((d) => {
                      d.hiddenRecipes = [...(d.hiddenRecipes ?? []), current.id];
                    });
                    say(`Hats won’t suggest ${current.name}.`);
                  }}
                />
              </Row>
              {picking ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginHorizontal: -20 }}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
                >
                  {week.map((date) => {
                    const has = dinnerFor(data, date);
                    return (
                      <Pressable
                        key={date}
                        accessibilityRole="button"
                        accessibilityLabel={`${dayLabel(date, today)}${has.planned ? `, replaces ${has.meal?.name}` : ""}`}
                        onPress={() => plan(date, current.id, current.name)}
                        style={({ pressed }) => ({
                          width: 104,
                          padding: 10,
                          gap: 2,
                          borderRadius: 16,
                          backgroundColor: pressed ? "#FFF0C2" : P.paper,
                          ...sticker(pressed ? 2 : 3),
                        })}
                      >
                        <T bold size={14}>
                          {dayLabel(date, today)}
                        </T>
                        <T size={11} muted numberOfLines={2}>
                          {has.planned ? `Now: ${has.meal?.name}` : "Open"}
                        </T>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : null}
            </View>
          ) : null}
        </>
      ) : (
        <Panel>
          <T bold>Nothing in this stack.</T>
          <T muted>
            {filter === "pantry"
              ? "Add a few staples you usually keep, and Hats will find dinners that use them."
              : "Try a different filter."}
          </T>
          {(data.hiddenRecipes ?? []).length ? (
            <Button
              title="Bring back the ones I hid"
              quiet
              small
              onPress={() =>
                mutate((d) => {
                  d.hiddenRecipes = [];
                })
              }
            />
          ) : null}
        </Panel>
      )}

      {/* The week */}
      <Section
        hat="cap"
        title="This week"
        action={unplanned.length ? "Plan the rest" : undefined}
        onPress={
          unplanned.length
            ? () => {
                let n = 0;
                mutate((d) => {
                  n = planWeek(d, today, true);
                });
                haptic("success");
                say(n ? `Planned ${n} ${n === 1 ? "dinner" : "dinners"}. The list is updated.` : "The week is already planned.");
              }
            : undefined
        }
      />
      <View style={{ gap: 8 }}>
        {plan7.map((d) => {
          const date = d.date;
          const r = recipeById(d.meal?.id);
          const low = data.lowEnergyDays.includes(date);
          return (
            <Pressable
              key={date}
              accessibilityRole="button"
              accessibilityLabel={`${dayLabel(date, today)}: ${d.meal ? `${d.planned ? "" : "idea, "}${d.meal.name}` : "nothing planned"}`}
              onPress={() => (d.meal ? open(d.meal.id) : undefined)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                padding: 10,
                borderRadius: 20,
                backgroundColor: date === today ? "#FFF0C2" : P.paper,
                opacity: pressed ? 0.9 : 1,
                ...sticker(date === today ? 4 : 2),
              })}
            >
              <View style={{ width: 44, alignItems: "center" }}>
                <T size={11} bold muted>
                  {date === today ? "TODAY" : dayShort(date).toUpperCase()}
                </T>
                <T display size={20}>
                  {fromISO(date).getDate()}
                </T>
              </View>
              <Food id={r?.art ?? "plate"} size={38} />
              <View style={{ flex: 1, gap: 2 }}>
                <T bold size={15} numberOfLines={1} color={d.planned ? P.ink : P.muted}>
                  {d.meal ? d.meal.name : "Nothing planned"}
                </T>
                <T size={12} muted numberOfLines={1}>
                  {d.planned
                    ? `${r ? timeLabel(r) : `${d.meal?.minutes} min`}${low ? " · lighter day" : ""}`
                    : d.meal
                      ? "An idea · tap Plan to keep it"
                      : "Add a few dinners to plan from"}
                </T>
              </View>
              {d.planned ? (
                <Button title="Swap" small quiet onPress={() => swap(date)} />
              ) : d.meal ? (
                <Button title="Plan" small onPress={() => plan(date, d.meal!.id, d.meal!.name)} />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {/* Groceries */}
      <Panel tint="#DCE9FA">
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Hat id="cap" size={34} tilt={-8} />
          <T size={12} bold style={{ flex: 1 }}>
            GROCERIES · {data.groceries.length}
          </T>
          {data.groceries.length ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share the grocery list"
              onPress={shareList}
              style={{ minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}
            >
              <Icon name="share" size={18} color={P.ink} width={2} />
              <T size={13} bold>
                Share
              </T>
            </Pressable>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <TextInput
            accessibilityLabel="Add to the grocery list"
            value={item}
            onChangeText={setItem}
            onSubmitEditing={addItem}
            placeholder="Add milk, bananas…"
            placeholderTextColor={P.muted}
            returnKeyType="done"
            style={{
              flex: 1,
              minHeight: 46,
              borderRadius: 14,
              backgroundColor: P.paper,
              borderWidth: 2,
              borderColor: P.ink,
              paddingHorizontal: 12,
              fontSize: 15,
              color: P.ink,
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add"
            onPress={addItem}
            style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: P.ink, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="plus" size={20} color={P.paper} width={2.4} />
          </Pressable>
        </View>
        {data.groceries.length ? (
          byAisle(data.groceries).map((g) => (
            <View key={g.aisle} style={{ gap: 2 }}>
              <T size={11} bold color={P.muted} style={{ marginTop: 6 }}>
                {g.aisle.toUpperCase()}
              </T>
              {g.items.map((x) => (
                <View key={x} style={{ flexDirection: "row", alignItems: "center" }}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: false }}
                    accessibilityLabel={`Got ${x}`}
                    onPress={() => {
                      mutate((d) => {
                        d.groceries = d.groceries.filter((y) => y !== x);
                        if (!d.pantry.some((p) => sameItem(p, x))) d.pantry.push(x);
                      });
                      haptic("tap");
                      say(`Got ${x}. It’s in your kitchen now.`);
                    }}
                    style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 }}
                  >
                    <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: P.ink, backgroundColor: P.paper }} />
                    <T size={15} style={{ flex: 1 }}>
                      {x}
                    </T>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${x} from the list`}
                    onPress={() =>
                      mutate((d) => {
                        d.groceries = d.groceries.filter((y) => y !== x);
                      })
                    }
                    style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
                  >
                    <Icon name="close" size={16} color={P.muted} width={2} />
                  </Pressable>
                </View>
              ))}
            </View>
          ))
        ) : (
          <T muted>All stocked. Planning a dinner adds what it needs.</T>
        )}
      </Panel>

      {/* What's at home: drives "Use what I have" and keeps it off the list */}
      <Panel tint="#E6F2E3">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: kitchenOpen }}
          accessibilityLabel={`In your kitchen, ${data.pantry.length} things`}
          onPress={() => setKitchenOpen(!kitchenOpen)}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 }}
        >
          <Food id="plate" size={34} />
          <View style={{ flex: 1 }}>
            <T size={12} bold>
              IN YOUR KITCHEN · {data.pantry.length}
            </T>
            <T size={12} muted numberOfLines={1}>
              {data.pantry.length ? data.pantry.slice(0, 6).join(", ") : "Checked-off groceries land here"}
            </T>
          </View>
          <Icon name={kitchenOpen ? "minus" : "plus"} size={18} color={P.ink} width={2.2} />
        </Pressable>
        {kitchenOpen ? (
          <>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <TextInput
                accessibilityLabel="Add something you have at home"
                value={staple}
                onChangeText={setStaple}
                onSubmitEditing={() => {
                  const name = staple.trim();
                  if (!name) return;
                  mutate((d) => {
                    if (!d.pantry.some((x) => sameItem(x, name))) d.pantry.push(name);
                  });
                  setStaple("");
                }}
                placeholder="Rice, eggs, pasta…"
                placeholderTextColor={P.muted}
                returnKeyType="done"
                style={{ flex: 1, minHeight: 46, borderRadius: 14, backgroundColor: P.paper, borderWidth: 2, borderColor: P.ink, paddingHorizontal: 12, fontSize: 15, color: P.ink }}
              />
            </View>
            <Row>
              {data.pantry.map((x) => (
                <Chip
                  key={x}
                  title={`${x} ×`}
                  onPress={() =>
                    mutate((d) => {
                      d.pantry = d.pantry.filter((y) => y !== x);
                    })
                  }
                />
              ))}
            </Row>
            <T size={12} muted>
              Tap one when it runs out. “Use what I have” finds dinners from these.
            </T>
          </>
        ) : null}
      </Panel>

      {/* Your go-tos */}
      <Section hat="crown" title="Your go-to dinners" action="Add your own" onPress={() => router.push("/hat/home")} />
      {data.meals.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -20 }}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
        >
          {data.meals.map((m) => {
            const r = recipeById(m.id);
            return (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                accessibilityLabel={`${m.name}. Open.`}
                onPress={() => open(m.id)}
                style={({ pressed }) => ({
                  width: 132,
                  padding: 12,
                  gap: 6,
                  borderRadius: 20,
                  backgroundColor: r?.tint ?? P.paper,
                  ...sticker(pressed ? 2 : 4),
                })}
              >
                <Food id={r?.art ?? "plate"} size={48} tilt={-6} />
                <T bold size={13} numberOfLines={2}>
                  {m.name}
                </T>
                <T size={11} muted>
                  {m.minutes} min
                </T>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <T muted>
          Tap ♡ on a recipe card to keep it here, or add a dinner your family already loves.
        </T>
      )}
    </Page>
  );
}
