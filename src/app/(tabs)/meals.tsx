import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { addDays, dayShort, fromISO } from "../../engine/dates";
import { shoppingFor } from "../../personal/engine";
import { Hat } from "../../personal/Hat";
import { usePersonal } from "../../personal/Store";
import {
  Button,
  Empty,
  Header,
  P,
  Page,
  Panel,
  Row,
  T,
  sticker,
} from "../../personal/ui";

export default function Meals() {
  const { data, today, mutate, say } = usePersonal();
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const meal = (date: string) =>
    data.meals.find((m) => m.id === data.dinners[date]);
  const swap = (date: string) => {
    const used = week.map((d) => data.dinners[d]);
    const current = data.dinners[date];
    const options = data.meals.filter((m) => m.id !== current);
    const next =
      options.find((m) => !used.includes(m.id)) ?? options[0] ?? null;
    if (!next) return;
    mutate((d) => {
      d.dinners[date] = next.id;
      for (const item of shoppingFor(d, next.id))
        if (!d.groceries.includes(item)) d.groceries.push(item);
    });
    say(`${dayShort(date)}: ${next.name}`);
  };
  return (
    <Page>
      <Header
        title="Dinner’s handled."
        subtitle="Hats plans the week and builds the list. Swap anything."
        hat="chef"
      />
      {!data.meals.length ? (
        <Empty
          hat="chef"
          title="Add a few dinners your family eats"
          detail="Chicken & rice, pasta, tacos, breakfast for dinner. Hats will plan the week from them."
          action="Add dinners"
          onPress={() => router.push("/hat/home")}
        />
      ) : (
        <View style={{ gap: 8 }}>
          {week.map((date) => {
            const m = meal(date);
            const low = data.lowEnergyDays.includes(date);
            return (
              <View
                key={date}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  padding: 10,
                  borderRadius: 20,
                  backgroundColor: date === today ? "#FFF0C2" : P.paper,
                  ...sticker(date === today ? 4 : 2),
                }}
              >
                <View style={{ width: 44, alignItems: "center" }}>
                  <T size={11} bold muted>
                    {date === today ? "TODAY" : dayShort(date).toUpperCase()}
                  </T>
                  <T display size={20}>
                    {fromISO(date).getDate()}
                  </T>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <T bold size={16}>
                    {m?.name ?? "Not planned yet"}
                  </T>
                  <T size={12} muted>
                    {m
                      ? `${m.minutes} min${m.favorite ? " · go-to" : ""}${low ? " · lighter day" : ""}`
                      : "Hats fills this in when you open the app"}
                  </T>
                </View>
                <Button title="Swap" small quiet onPress={() => swap(date)} />
              </View>
            );
          })}
        </View>
      )}
      <Panel tint="#DCE9FA">
        <Row>
          <Hat id="cap" size={34} tilt={-8} />
          <T size={12} bold>
            GROCERIES · {data.groceries.length}
          </T>
        </Row>
        {data.groceries.length ? (
          data.groceries.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: false }}
              accessibilityLabel={`Got ${item}`}
              onPress={() => {
                mutate((d) => {
                  d.groceries = d.groceries.filter((x) => x !== item);
                  if (
                    !d.pantry.some(
                      (p) => p.toLowerCase() === item.toLowerCase(),
                    )
                  )
                    d.pantry.push(item);
                });
                say(`Got ${item}`);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                minHeight: 40,
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 7,
                  borderWidth: 2,
                  borderColor: P.ink,
                  backgroundColor: P.paper,
                }}
              />
              <T size={15}>{item}</T>
            </Pressable>
          ))
        ) : (
          <T muted>All stocked. Hats adds what the week’s dinners need.</T>
        )}
      </Panel>
      <Button
        title="Recipes, pantry & go-to dinners"
        quiet
        hat="chef"
        onPress={() => router.push("/hat/home")}
      />
    </Page>
  );
}
