import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { addDays, dayShort, fromISO } from "../../engine/dates";
import { Icon } from "../../ui/icons";
import { Food, Hat } from "../../personal/Hat";
import { haptic } from "../../personal/haptics";
import {
  addMissing,
  asMeal,
  dinnerFor,
  findMeal,
  inPantry,
  isGoTo,
  missingFor,
  planDinner,
} from "../../personal/meals";
import { PantryMeter, timeLabel } from "../../personal/RecipeCard";
import { TAG_LABEL, recipeById, sameItem } from "../../personal/recipes";
import { usePersonal } from "../../personal/Store";
import { Button, Header, P, Page, Panel, Row, T, sticker } from "../../personal/ui";

/** A recipe, from the library or one of your own dinners: plan it, shop for it, cook it. */
export default function RecipePage() {
  const { id, cook } = useLocalSearchParams<{ id: string; cook?: string }>();
  const { data, today, mutate, say, celebrate } = usePersonal();
  const insets = useSafeAreaInsets();
  const r = recipeById(id);
  const meal = findMeal(data, id);
  const [picking, setPicking] = useState(false);
  // Opened from Today's "Cook it": straight into cooking mode.
  const [cooking, setCooking] = useState(cook === "1" && !!recipeById(id));
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!cooking) return;
    // The screen stays on while you cook with messy hands.
    activateKeepAwakeAsync("cook").catch(() => {});
    return () => {
      deactivateKeepAwake("cook").catch(() => {});
    };
  }, [cooking]);

  if (!meal) {
    return (
      <Page tabs={false}>
        <Header title="That recipe is gone." subtitle="It may have been removed." back />
        <Button title="Back to meals" onPress={() => router.replace("/meals")} />
      </Page>
    );
  }
  const name = meal.name;
  const week = Array.from({ length: 7 }, (_, n) => addDays(today, n));
  const plannedOn = week.filter((d) => data.dinners[d] === meal.id);
  const missing = missingFor(data, meal.id);
  const onList = missing.filter((m) => data.groceries.some((g) => sameItem(g, m)));
  const toAdd = missing.length - onList.length;
  const goTo = isGoTo(data, meal.id);
  const hidden = (data.hiddenRecipes ?? []).includes(meal.id);
  const label = (d: string) =>
    d === today ? "Tonight" : d === addDays(today, 1) ? "Tomorrow" : `${dayShort(d)} ${fromISO(d).getDate()}`;
  const steps = r?.steps ?? (meal.prep ? [meal.prep] : []);
  const ingredients = r?.ingredients ?? meal.ingredients.map((item) => ({ amount: "", item, aisle: "Other" as const }));

  const plan = (date: string) => {
    let added: string[] = [];
    mutate((d) => {
      added = planDinner(d, date, meal.id);
    });
    haptic("success");
    setPicking(false);
    say(`${label(date)}: ${name}${added.length ? ` · ${added.length} added to groceries` : ""}`);
  };
  const finish = () => {
    setCooking(false);
    setStep(0);
    mutate((d) => {
      if (dinnerFor(d, today).meal?.id !== meal.id) d.dinners[today] = meal.id;
      d.routineDone ??= {};
      const done = d.routineDone[today] ?? [];
      if (!done.includes("dinner")) d.routineDone[today] = [...done, "dinner"];
    });
    haptic("success");
    celebrate({ hat: "chef" });
    say("Dinner’s ready. Enjoy it together.");
  };

  return (
    <View style={{ flex: 1, backgroundColor: P.bg }}>
      <Page tabs={false}>
        <Header title={name} subtitle={r?.blurb ?? "One of your dinners."} back />
        <View
          style={{
            backgroundColor: r?.tint ?? "#FFF0C2",
            borderRadius: 28,
            padding: 18,
            alignItems: "center",
            gap: 10,
            ...sticker(5),
          }}
        >
          <Food id={r?.art ?? "plate"} size={150} tilt={-6} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
            {(r?.tags ?? []).map((t) => (
              <View key={t} style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12, backgroundColor: P.paper, borderWidth: 1.5, borderColor: P.ink }}>
                <T size={11} bold>
                  {TAG_LABEL[t]}
                </T>
              </View>
            ))}
          </View>
          <Row>
            <Icon name="clock" size={16} color={P.ink} width={2} />
            <T bold>{r ? timeLabel(r) : `${meal.minutes} min`}</T>
            {r ? <T muted>· Serves {r.serves}</T> : null}
          </Row>
          {plannedOn.length ? (
            <T size={13} bold color={P.blue}>
              Planned for {plannedOn.map(label).join(", ")}
            </T>
          ) : null}
        </View>

        <Row>
          {steps.length ? (
            <Button title="Cook it" icon="play" tone="sun" onPress={() => { setStep(0); setCooking(true); }} />
          ) : null}
          <Button title={picking ? "Pick a night" : "Plan it"} icon="calendar" quiet={!picking} onPress={() => setPicking(!picking)} />
          {r ? (
            <Button
              title={goTo ? "♥ Go-to" : "♡ Go-to"}
              quiet
              onPress={() => {
                mutate((d) => {
                  if (goTo) d.meals = d.meals.filter((m) => m.id !== meal.id);
                  else d.meals.push({ ...asMeal(r), favorite: true });
                });
                say(goTo ? `${name} is just an idea again.` : `${name} is a go-to now.`);
              }}
            />
          ) : null}
        </Row>
        {picking ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            {week.map((date) => {
              const has = dinnerFor(data, date);
              return (
                <Pressable
                  key={date}
                  accessibilityRole="button"
                  accessibilityLabel={`${label(date)}${has.planned ? `, replaces ${has.meal?.name}` : ""}`}
                  onPress={() => plan(date)}
                  style={({ pressed }) => ({ width: 104, padding: 10, gap: 2, borderRadius: 16, backgroundColor: pressed ? "#FFF0C2" : P.paper, ...sticker(pressed ? 2 : 3) })}
                >
                  <T bold size={14}>{label(date)}</T>
                  <T size={11} muted numberOfLines={2}>{has.planned ? `Now: ${has.meal?.name}` : "Open"}</T>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <Panel>
          <T display size={19}>Ingredients</T>
          {r ? <PantryMeter data={data} r={r} /> : null}
          {ingredients.map((x) => {
            const have = inPantry(data, x.item);
            const listed = data.groceries.some((g) => sameItem(g, x.item));
            return (
              <Pressable
                key={x.item}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: have }}
                accessibilityLabel={`${x.amount} ${x.item}${have ? ", in your kitchen" : listed ? ", on the grocery list" : ""}`}
                accessibilityHint={have ? "Marks it as used up" : "Marks it as in your kitchen"}
                onPress={() => {
                  mutate((d) => {
                    if (have) d.pantry = d.pantry.filter((p) => !sameItem(p, x.item));
                    else {
                      d.pantry.push(x.item);
                      d.groceries = d.groceries.filter((g) => !sameItem(g, x.item));
                    }
                  });
                  haptic("tap");
                }}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 7,
                    borderWidth: 2,
                    borderColor: P.ink,
                    backgroundColor: have ? "#5E9C6A" : P.paper,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {have ? <Icon name="check" size={14} color={P.paper} width={3} /> : null}
                </View>
                <T style={{ flex: 1 }} color={have ? P.muted : P.ink}>
                  {x.amount ? <T bold color={have ? P.muted : P.ink}>{x.amount} </T> : null}
                  {x.item}
                </T>
                {listed && !have ? (
                  <T size={11} bold color={P.blue}>ON THE LIST</T>
                ) : null}
              </Pressable>
            );
          })}
          <T size={12} muted>Tap what you already have. Salt, pepper, and oil are assumed.</T>
          <Button
            title={toAdd ? `Add ${toAdd} missing to groceries` : missing.length ? "Everything missing is on the list" : "You have everything"}
            quiet
            icon="list"
            disabled={!toAdd}
            onPress={() => {
              let added: string[] = [];
              mutate((d) => {
                added = addMissing(d, meal.id);
              });
              haptic("success");
              say(`${added.length} ${added.length === 1 ? "thing" : "things"} added to groceries.`);
            }}
          />
        </Panel>

        {steps.length ? (
          <Panel>
            <T display size={19}>{r ? "How it goes" : "Your notes"}</T>
            {steps.map((s, n) => (
              <View key={n} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: P.sun, borderWidth: 2, borderColor: P.ink, alignItems: "center", justifyContent: "center" }}>
                  <T bold size={13}>{n + 1}</T>
                </View>
                <T style={{ flex: 1 }} size={16}>{s}</T>
              </View>
            ))}
          </Panel>
        ) : null}

        {r ? (
          <Panel tint="#FFF0C2">
            <Row>
              <Hat id="propeller" size={34} tilt={-8} />
              <T bold>Kids can help</T>
            </Row>
            <T>{r.kids}</T>
            {r.tip ? <T muted>Tip: {r.tip}</T> : null}
          </Panel>
        ) : null}

        {r ? (
          <Button
            title={hidden ? "Suggest this again" : "Not for us"}
            quiet
            small
            onPress={() => {
              mutate((d) => {
                d.hiddenRecipes = hidden
                  ? (d.hiddenRecipes ?? []).filter((x) => x !== meal.id)
                  : [...(d.hiddenRecipes ?? []), meal.id];
              });
              say(hidden ? `${name} is back in the cards.` : `Hats won’t suggest ${name}.`);
            }}
          />
        ) : null}
      </Page>

      {cooking ? (
        <View
          accessibilityViewIsModal
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: P.ink,
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 20,
            paddingHorizontal: 22,
            gap: 18,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Stop cooking mode"
              onPress={() => setCooking(false)}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#2E4366", alignItems: "center", justifyContent: "center" }}
            >
              <Icon name="close" size={18} color={P.paper} width={2.4} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <T size={12} bold color={P.sun}>
                STEP {step + 1} OF {steps.length}
              </T>
              <T size={14} color="#C8D7EA" numberOfLines={1}>{name}</T>
            </View>
            <Food id={r?.art ?? "plate"} size={44} />
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: "#2E4366", overflow: "hidden" }}>
            <View style={{ width: `${((step + 1) / steps.length) * 100}%`, height: 8, backgroundColor: P.sun }} />
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
            <T display size={28} color={P.paper} style={{ lineHeight: 38 }}>
              {steps[step]}
            </T>
            {step === steps.length - 1 && r ? (
              <T size={15} color="#C8D7EA" style={{ marginTop: 18 }}>
                Kids can: {r.kids}
              </T>
            ) : null}
          </ScrollView>
          <T size={12} color="#8FA3BF" style={{ textAlign: "center" }}>
            The screen stays on while you cook.
          </T>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous step"
              disabled={step === 0}
              onPress={() => setStep(step - 1)}
              style={{ flex: 1, minHeight: 60, borderRadius: 20, backgroundColor: "#2E4366", alignItems: "center", justifyContent: "center", opacity: step === 0 ? 0.4 : 1 }}
            >
              <T bold size={17} color={P.paper}>Back</T>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={step === steps.length - 1 ? "Dinner is ready" : "Next step"}
              onPress={() => {
                haptic("tap");
                if (step === steps.length - 1) finish();
                else setStep(step + 1);
              }}
              style={{ flex: 2, minHeight: 60, borderRadius: 20, backgroundColor: P.sun, alignItems: "center", justifyContent: "center" }}
            >
              <T bold size={17}>{step === steps.length - 1 ? "Dinner’s ready" : "Next"}</T>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
