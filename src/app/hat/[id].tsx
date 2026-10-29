import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Image, Linking, Pressable, View } from "react-native";
import { Hat } from "../../personal/Hat";
import { addDays, fmtRelative, fmtTime } from "../../engine/dates";
import { periodLabel, schoolBlocks, schoolOn } from "../../personal/school";
import {
  activityFor,
  budgetSummary,
  makeTask,
  shoppingFor,
} from "../../personal/engine";
import { amount, required, useEditor } from "../../personal/Editor";
import {
  HATS,
  HAT_IDS,
  id,
  type PersonalHat,
  type Spending,
} from "../../personal/model";
import { usePersonal } from "../../personal/Store";
import { Streaks } from "../../personal/Streaks";
import {
  Button,
  Check,
  Chip,
  Empty,
  Header,
  P,
  Page,
  Panel,
  Row,
  Section,
  T,
  TaskCard,
} from "../../personal/ui";

export default function HatPage() {
  const params = useLocalSearchParams<{ id: PersonalHat }>();
  const hat = HAT_IDS.includes(params.id) ? params.id : "home";
  const def = HATS[hat];
  const { data, mutate, today, say } = usePersonal();
  const editor = useEditor();
  const [showDone, setShowDone] = useState(false);
  const [showKnown, setShowKnown] = useState(false);
  const tasks = data.tasks.filter(
    (t) => t.hat === hat && (showDone ? !!t.doneAt : !t.doneAt),
  );
  const allNotes = data.notes
    .filter((n) => n.hat === hat)
    .slice()
    .reverse();
  // Notes imported from the private setup describe the family for planning;
  // they fold away instead of looking like to-dos.
  const known = allNotes.filter((n) => n.id.startsWith("profile-note-"));
  const notes = allNotes.filter((n) => !n.id.startsWith("profile-note-"));
  const capture = (kind = "task") =>
    router.push({ pathname: "/capture", params: { hat, kind } });
  const person = (role: "child" | "friend" | "pet") =>
    editor.open({
      title:
        role === "pet"
          ? "Someone with paws"
          : role === "child"
            ? "Your child"
            : "Someone you care about",
      fields: [
        { key: "name", label: "Name" },
        {
          key: "interests",
          label:
            role === "pet"
              ? "Care and routines"
              : "Interests and things to remember",
          multiline: true,
        },
        { key: "detail", label: "Useful details", multiline: true },
      ],
      onSave: (v) =>
        mutate((d) => {
          d.people.push({
            id: id(),
            role,
            name: required(v.name, "a name"),
            interests: v.interests,
            detail: v.detail,
          });
        }),
    });
  const newDate = () =>
    editor.open({
      title: "Make a date happen",
      detail:
        "The date budget is separate from childcare and transportation. Nothing is booked or sent automatically.",
      fields: [
        {
          key: "title",
          label: "Date idea",
          placeholder: "A new restaurant and a walk",
        },
        {
          key: "date",
          label: "Preferred date · YYYY-MM-DD",
          value: addDays(today, 7),
        },
        {
          key: "childcare",
          label: "Estimated childcare cost",
          value: "0",
          numeric: true,
        },
        {
          key: "transport",
          label: "Estimated transportation cost",
          value: "0",
          numeric: true,
        },
        {
          key: "note",
          label: "Preferences, restaurant, movie, or childcare details",
          multiline: true,
        },
      ],
      onSave: (v) => {
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(v.date) ||
          !Number.isFinite(new Date(`${v.date}T12:00:00`).getTime())
        )
          throw new Error("Use a valid date in YYYY-MM-DD format.");
        const title = required(v.title, "a date idea");
        const childcare = amount(v.childcare, true),
          transport = amount(v.transport, true);
        mutate((d) => {
          d.dates.push({
            id: id(),
            date: v.date,
            title,
            budget: d.preferences.dateBudget,
            childcare,
            transport,
            note: v.note,
            steps: [
              "Check our availability",
              "Confirm childcare",
              "Choose and confirm the activity",
              "Plan transportation and getting ready",
            ].map((title) => ({ title, done: false })),
          });
        });
      },
    });
  const addMeal = () =>
    editor.open({
      title: "A dinner that works",
      fields: [
        { key: "name", label: "Meal name" },
        {
          key: "ingredients",
          label: "Ingredients · separate with commas",
          multiline: true,
        },
        {
          key: "minutes",
          label: "Cooking time in minutes",
          value: "20",
          numeric: true,
        },
        {
          key: "prep",
          label: "Anything to do earlier?",
          placeholder: "Thaw in the refrigerator; prep vegetables…",
        },
      ],
      onSave: (v) => {
        const minutes = Number(v.minutes);
        if (!Number.isFinite(minutes) || minutes < 1 || minutes > 240)
          throw new Error("Use a cooking time from 1 to 240 minutes.");
        const name = required(v.name, "a meal name");
        mutate((d) => {
          d.meals.push({
            id: id(),
            name,
            ingredients: v.ingredients
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean),
            minutes,
            prep: v.prep,
            favorite: true,
          });
        });
      },
    });
  const spend = (wishlist = false) =>
    editor.open({
      title: wishlist ? "Save it for later" : "Log a purchase",
      detail: wishlist
        ? "Give the idea somewhere to wait. You can reconsider after the urge has passed."
        : "These are your logged amounts, not a connected bank balance.",
      fields: [
        { key: "title", label: "What is it?" },
        { key: "amount", label: "Cost in dollars", numeric: true },
        ...(!wishlist
          ? [
              {
                key: "category",
                label: "Category",
                value: "takeout",
                options: ["takeout", "dates", "gifts", "family", "other"],
              },
            ]
          : []),
      ],
      onSave: (v) => {
        const title = required(v.title, "a description");
        const cost = amount(v.amount);
        if (
          !wishlist &&
          !["takeout", "dates", "gifts", "family", "other"].includes(v.category)
        )
          throw new Error("Choose one of the listed categories.");
        mutate((d) => {
          if (wishlist)
            d.wishes.push({
              id: id(),
              title,
              amount: cost,
              createdAt: new Date().toISOString(),
            });
          else
            d.spending.push({
              id: id(),
              title,
              amount: cost,
              category: v.category as Spending["category"],
              date: today,
            });
        });
      },
    });
  const budgets = () =>
    editor.open({
      title: "Give your money a purpose",
      detail:
        "Monthly targets. Empty or zero means no target set; it does not mean zero funds are available.",
      fields: Object.entries(data.preferences.budgets).map(([key, value]) => ({
        key,
        label:
          key === "savings"
            ? "Savings goal per month"
            : `${key.charAt(0).toUpperCase() + key.slice(1)} per month`,
        value: String(value),
        numeric: true,
      })),
      onSave: (v) => {
        const values = Object.fromEntries(
          Object.entries(v).map(([k, n]) => [k, amount(n, true)]),
        );
        mutate((d) => {
          d.preferences.budgets = values as typeof d.preferences.budgets;
        });
      },
    });
  return (
    <Page tabs={false}>
      <Header title={def.name} subtitle={def.subtitle} back hat={def.art} />
      <Row>
        <Button title="Add a commitment" small onPress={() => capture()} />
        <Button
          title="Keep an idea"
          quiet
          small
          onPress={() => capture("idea")}
        />
      </Row>
      {hat === "husband" ? (
        <>
          <Panel dark>
            <T size={21} display color="#FFFDFA">
              Small things, remembered.
            </T>
            <T color="#D5DDE8">
              Give {data.preferences.partner || "your partner"} your attention,
              remember what matters to them, and take care of the details.
            </T>
            <Row>
              <Button
                title="Plan a date"
                quiet
                hat="fedora"
                onPress={newDate}
              />
              <Button
                title="Save a gift idea"
                quiet
                hat="party"
                onPress={() => capture("gift")}
              />
            </Row>
          </Panel>
          <Button
            title="Organize my feelings privately"
            quiet
            icon="lock"
            onPress={() => capture("reflection")}
          />
          {data.dates
            .slice()
            .reverse()
            .map((date) => (
              <Panel key={date.id}>
                <T size={19} display>
                  {date.title}
                </T>
                <T muted>
                  {date.date} · ${date.budget} date + ${date.childcare}{" "}
                  childcare + ${date.transport} transport
                </T>
                <T bold>
                  Total planned: $
                  {(date.budget + date.childcare + date.transport).toFixed(2)}
                </T>
                {date.note ? <T muted>{date.note}</T> : null}
                {date.steps.map((step, index) => (
                  <Check
                    strike
                    key={index}
                    title={step.title}
                    done={step.done}
                    onPress={() =>
                      mutate((d) => {
                        const p = d.dates.find((x) => x.id === date.id);
                        if (p) p.steps[index].done = !p.steps[index].done;
                      })
                    }
                  />
                ))}
                <Row>
                  <Button
                    title="Find restaurants"
                    quiet
                    small
                    onPress={() =>
                      Linking.openURL(
                        `https://www.google.com/maps/search/${encodeURIComponent(`restaurants near ${data.preferences.city || "me"}`)}`,
                      )
                    }
                  />
                  <Button
                    title="Remove plan"
                    quiet
                    small
                    onPress={() =>
                      mutate((d) => {
                        d.dates = d.dates.filter((x) => x.id !== date.id);
                      })
                    }
                  />
                </Row>
                <T size={12} muted>
                  Check live availability, the full cost, and travel time before
                  booking. Nothing has been booked by Hats.
                </T>
              </Panel>
            ))}
        </>
      ) : null}
      {hat === "dad" ? (
        <>
          <Section
            hat="party"
            title="Your crew"
            action="Add child"
            onPress={() => person("child")}
          />
          {data.people
            .filter((p) => p.role === "child")
            .map((p) => (
              <Panel key={p.id} tint={def.tint}>
                <T size={19} display>
                  {p.name}
                </T>
                <Row>
                  {p.interests
                    .split(/,| and /)
                    .map((x) => x.trim().replace(/\.$/, ""))
                    .filter(Boolean)
                    .slice(0, 6)
                    .map((x) => (
                      <View
                        key={x}
                        style={{
                          backgroundColor: P.paper,
                          borderRadius: 12,
                          paddingHorizontal: 9,
                          paddingVertical: 3,
                        }}
                      >
                        <T size={12} bold>
                          {x}
                        </T>
                      </View>
                    ))}
                </Row>
                {p.detail ? (
                  <T muted size={13}>
                    {p.detail}
                  </T>
                ) : null}
                <Button
                  title="Edit"
                  quiet
                  small
                  onPress={() =>
                    editor.open({
                      title: p.name,
                      fields: [
                        { key: "name", label: "Name", value: p.name },
                        {
                          key: "interests",
                          label: "Interests",
                          value: p.interests,
                          multiline: true,
                        },
                        {
                          key: "detail",
                          label: "Helpful context",
                          value: p.detail,
                          multiline: true,
                        },
                      ],
                      onSave: (v) =>
                        mutate((d) => {
                          const person = d.people.find((x) => x.id === p.id);
                          if (person)
                            Object.assign(person, {
                              name: required(v.name, "a name"),
                              interests: v.interests,
                              detail: v.detail,
                            });
                        }),
                    })
                  }
                />
              </Panel>
            ))}
          <Panel>
            <T size={19} display>
              {activityFor(data, today)[1]}
            </T>
            <T muted>{activityFor(data, today)[2]}</T>
            <Button
              title="Put a family activity in my plan"
              onPress={() => {
                mutate((d) => {
                  d.tasks.push(
                    makeTask(activityFor(d, today)[1], "dad", today, {
                      minutes: 20,
                    }),
                  );
                });
                say("Family time added.");
              }}
            />
          </Panel>
          <Panel>
            <T size={19} display>
              A weekend worth looking forward to
            </T>
            <T muted>
              Allow up to {data.preferences.travelMinutes} minutes each way,
              plus getting ready. Check weather, cost, opening hours, and
              everyone’s needs.
            </T>
            <Row>
              <Button
                title="Explore nearby outings"
                quiet
                onPress={() =>
                  Linking.openURL(
                    `https://www.google.com/maps/search/${encodeURIComponent(`family activities near ${data.preferences.city || "me"}`)}`,
                  )
                }
              />
              <Button
                title="Plan an outing"
                onPress={() => {
                  mutate((d) => {
                    d.tasks.push(
                      makeTask("Plan a family outing", "dad", today, {
                        steps: [
                          "Pick an activity everyone can enjoy",
                          "Check weather, opening hours, and cost",
                          "Allow travel and preparation time",
                          "Pack what the kids need",
                        ].map((title) => ({ title, done: false })),
                      }),
                    );
                  });
                  say("Outing preparation added.");
                }}
              />
            </Row>
          </Panel>
        </>
      ) : null}
      {hat === "pets" ? (
        <>
          <Section
            hat="catbeanie"
            title="The paws in your life"
            action="Add pet"
            onPress={() => person("pet")}
          />
          {data.people
            .filter((p) => p.role === "pet")
            .map((p) => (
              <Panel key={p.id}>
                <T size={19} display>
                  {p.name}
                </T>
                <T muted>{p.interests}</T>
                <T muted>{p.detail}</T>
                <Button
                  title="Add a care reminder"
                  quiet
                  onPress={() => {
                    mutate((d) => {
                      d.tasks.push(
                        makeTask(`Care for ${p.name}`, "pets", today, {
                          essential: true,
                          steps: [
                            "Food and fresh water",
                            "Exercise / litter / cleanup",
                            "Check supplies",
                          ].map((title) => ({ title, done: false })),
                          repeat: "daily",
                        }),
                      );
                    });
                    say("Daily care reminder added.");
                  }}
                />
              </Panel>
            ))}
          <Panel>
            <T bold>Care stays visible, not assumed.</T>
            <T muted>
              A regular walker is part of the plan. Hats does not mark a walk or
              feeding complete without your confirmation.
            </T>
            <Button
              title="Add grooming, vet, or training"
              quiet
              onPress={() => capture()}
            />
          </Panel>
        </>
      ) : null}
      {hat === "home" ? (
        <>
          <Section
            hat="chef"
            title="Reliable dinners"
            action="Add meal"
            onPress={addMeal}
          />
          {!data.meals.length ? (
            <Empty
              title="Start with three easy favorites"
              detail="No full pantry database needed. Save dinners your family actually eats."
              action="Add a reliable meal"
              onPress={addMeal}
            />
          ) : null}
          {data.meals.map((m) => (
            <Panel key={m.id}>
              <T size={19} display>
                {m.name}
              </T>
              <T muted>
                {m.minutes} minutes{m.prep ? ` · Earlier: ${m.prep}` : ""}
              </T>
              <T muted>{m.ingredients.join(", ")}</T>
              <Row>
                <Button
                  title="Choose tonight"
                  small
                  onPress={() => {
                    mutate((d) => {
                      d.dinners[today] = m.id;
                      for (const ingredient of shoppingFor(d, m.id))
                        if (!d.groceries.includes(ingredient))
                          d.groceries.push(ingredient);
                      if (
                        m.prep &&
                        !d.tasks.some(
                          (t) => t.source === `prep:${m.id}:${today}`,
                        )
                      )
                        d.tasks.push(
                          makeTask(m.prep, "home", today, {
                            minutes: 5,
                            essential: true,
                            source: `prep:${m.id}:${today}`,
                          }),
                        );
                    });
                    say(
                      "Dinner chosen. Missing ingredients added to groceries.",
                    );
                  }}
                />
                <Button
                  title="Remove meal"
                  small
                  quiet
                  onPress={() =>
                    mutate((d) => {
                      d.meals = d.meals.filter((x) => x.id !== m.id);
                    })
                  }
                />
              </Row>
            </Panel>
          ))}
          <Section
            hat="chef"
            title="Usually in the kitchen"
            action="Add staples"
            onPress={() => capture("pantry")}
          />
          <Row>
            {data.pantry.map((item) => (
              <Chip
                key={item}
                title={`${item} ×`}
                onPress={() =>
                  mutate((d) => {
                    d.pantry = d.pantry.filter((x) => x !== item);
                  })
                }
              />
            ))}
          </Row>
          <Section
            hat="chef"
            title="Grocery list"
            action="Add items"
            onPress={() => capture("groceries")}
          />
          {data.groceries.length ? (
            <Panel>
              {data.groceries.map((item) => (
                <Check
                  strike
                  key={item}
                  title={item}
                  done={false}
                  onPress={() =>
                    mutate((d) => {
                      d.groceries = d.groceries.filter((x) => x !== item);
                      if (!d.pantry.includes(item)) d.pantry.push(item);
                    })
                  }
                />
              ))}
            </Panel>
          ) : (
            <T muted>Choose a meal to build a list, or add what’s missing.</T>
          )}
          <Row>
            <Button
              title="Add a laundry cycle"
              quiet
              hat="cap"
              onPress={() =>
                mutate((d) => {
                  d.tasks.push(
                    makeTask("Laundry, all the way through", "home", today, {
                      steps: ["Wash", "Dry", "Fold", "Put away"].map(
                        (title) => ({ title, done: false }),
                      ),
                    }),
                  );
                })
              }
            />
            <Button
              title="Save an ingredient photo"
              quiet
              hat="chef"
              onPress={() => capture("idea")}
            />
          </Row>
        </>
      ) : null}
      {hat === "friends" ? (
        <>
          <Section
            hat="party"
            title="Your people"
            action="Add someone"
            onPress={() => person("friend")}
          />
          {data.people
            .filter((p) => p.role === "friend")
            .map((p) => (
              <Panel key={p.id}>
                <T size={19} display>
                  {p.name}
                </T>
                <T muted>{p.interests}</T>
                {p.detail ? <T muted>{p.detail}</T> : null}
                <T size={12} muted>
                  {p.lastContact
                    ? `Last contact logged: ${p.lastContact}`
                    : "No contact logged yet"}
                </T>
                <Row>
                  <Button
                    title="We caught up"
                    quiet
                    small
                    onPress={() =>
                      mutate((d) => {
                        const person = d.people.find((x) => x.id === p.id);
                        if (person) person.lastContact = today;
                      })
                    }
                  />
                  <Button
                    title="Remind me to reach out"
                    small
                    onPress={() => {
                      mutate((d) => {
                        d.tasks.push(
                          makeTask(`Reach out to ${p.name}`, "friends", today, {
                            minutes: 5,
                          }),
                        );
                      });
                      say("Added a reminder. Nothing was sent.");
                    }}
                  />
                </Row>
              </Panel>
            ))}
          <T muted>
            Keep chosen contacts and reminders here. Facebook access is not
            connected, and no messages are sent automatically.
          </T>
        </>
      ) : null}
      {hat === "work" ? (
        (() => {
          // Today's school day, or the next one.
          let day = today;
          for (let i = 0; i < 8 && !schoolBlocks(data, day).length; i++) day = addDays(today, i + 1);
          const blocks = schoolBlocks(data, day);
          return (
            <>
              <Panel dark>
                <T size={21} display color="#FFFDFA">
                  {!schoolOn(data)
                    ? "Your school day is off."
                    : day === today
                      ? "Today at school"
                      : `Next school day · ${fmtRelative(day, today)}`}
                </T>
                {blocks.map((b) => (
                  <View key={b.start} style={{ flexDirection: "row", gap: 10, alignItems: "baseline" }}>
                    <T size={13} color="#C8D7EA" style={{ width: 64 }}>
                      {fmtTime(b.start, true)}
                    </T>
                    <T size={15} bold color="#FFFDFA" style={{ flex: 1 }}>
                      {b.title}
                    </T>
                    <T size={12} color="#C8D7EA">
                      {periodLabel(b)}
                    </T>
                  </View>
                ))}
                <Button
                  title={schoolOn(data) ? "Change your classes" : "Turn on your school day"}
                  quiet
                  hat="mortarboard"
                  onPress={() => router.push("/settings")}
                />
              </Panel>
            </>
          );
        })()
      ) : null}
      {hat === "myself" ? (
        <>
          <Panel dark>
            <T size={21} display color="#FFFDFA">
              You get room here, too.
            </T>
            <T color="#D5DDE8">
              Fitness. Food. Rest. A song you love. No need to turn every
              interest into an obligation.
            </T>
            <Button
              title="Make room for 10 minutes of guitar"
              quiet
              hat="pompom"
              onPress={() => {
                mutate((d) => {
                  d.tasks.push(
                    makeTask("Play a song I already love", "myself", today, {
                      minutes: 10,
                      note: "Pick up the guitar. Keep it spontaneous; stop when you want.",
                    }),
                  );
                });
                say("A little room for guitar added.");
              }}
            />
            <Button
              title="Save a song or lesson"
              quiet
              onPress={() => capture("idea")}
            />
          </Panel>
          <Section
            hat="tophat"
            title="Money with a purpose"
            action="Monthly targets"
            onPress={budgets}
          />
          <T size={12} muted>
            Based on purchases you log here. A financial provider is not
            connected.
          </T>
          {(() => {
            const cats = (["takeout", "dates", "gifts", "family"] as const).map(
              (category) => ({
                category,
                b: budgetSummary(data, category, today.slice(0, 7)),
              }),
            );
            const active = cats.filter(
              (c) => c.b.spent > 0 || c.b.left != null,
            );
            if (!active.length)
              return (
                <Panel>
                  <T bold>Nothing logged this month</T>
                  <T muted size={14}>
                    Log takeout, dates, gifts, or family spending when it
                    happens and Hats keeps a simple monthly picture.
                  </T>
                </Panel>
              );
            return (
              <Panel>
                {active.map(({ category, b }) => (
                  <Row key={category}>
                    <T bold style={{ width: 70 }}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </T>
                    <T muted size={14} style={{ flex: 1 }}>
                      ${b.spent.toFixed(0)} this month
                      {b.left == null
                        ? ""
                        : ` · $${b.left.toFixed(0)} left of $${b.limit.toFixed(0)}`}
                    </T>
                  </Row>
                ))}
              </Panel>
            );
          })()}
          <T muted>
            Savings target:{" "}
            {data.preferences.budgets.savings
              ? `$${data.preferences.budgets.savings.toFixed(2)} per month`
              : "not set yet"}
            . This is a goal, not a verified savings balance.
          </T>
          <Row>
            <Button title="Log spending" onPress={() => spend()} />
            <Button
              title="Save a purchase for later"
              quiet
              onPress={() => spend(true)}
            />
          </Row>
          {data.wishes.map((w) => (
            <Panel key={w.id}>
              <T bold size={19}>
                {w.title} · ${w.amount.toFixed(2)}
              </T>
              <T muted>
                Saved {w.createdAt.slice(0, 10)}. Consider what this would leave
                for dates, gifts, family fun, and savings.
              </T>
              <Row>
                <Button
                  title="Keep waiting"
                  quiet
                  small
                  onPress={() =>
                    say("It can wait here until you’re ready to decide.")
                  }
                />
                <Button
                  title="Let this one go"
                  quiet
                  small
                  onPress={() =>
                    mutate((d) => {
                      d.wishes = d.wishes.filter((x) => x.id !== w.id);
                    })
                  }
                />
              </Row>
            </Panel>
          ))}
        </>
      ) : null}
      <Streaks hat={hat} />
      <Section
        hat={def.art}
        title={showDone ? "Finished commitments" : "Commitments"}
        action={showDone ? "Show open" : "Show finished"}
        onPress={() => setShowDone(!showDone)}
      />
      {tasks.length ? (
        tasks.map((task) =>
          task.doneAt ? (
            <Panel key={task.id}>
              <T bold>{task.title}</T>
              <Button
                title="Review / reopen"
                quiet
                small
                onPress={() =>
                  router.push({
                    pathname: "/task/[id]",
                    params: { id: task.id },
                  })
                }
              />
            </Panel>
          ) : (
            <TaskCard key={task.id} task={task} />
          ),
        )
      ) : (
        <T muted>
          {showDone
            ? "Finished tasks will appear here."
            : "Nothing else to carry here right now."}
        </T>
      )}
      <Section
        hat="wizard"
        title="Things worth remembering"
        action="Add"
        onPress={() => capture("idea")}
      />
      {notes.map((note) => (
        <Panel key={note.id}>
          <T size={12} bold color={def.color}>
            {note.kind === "reflection"
              ? "PRIVATE REFLECTION"
              : note.kind.toUpperCase()}{" "}
            · {fmtRelative(note.createdAt.slice(0, 10), today)}
          </T>
          <T>{note.text}</T>
          {note.photo ? (
            <>
              <Image
                source={{ uri: note.photo }}
                accessibilityLabel="Saved photo note"
                style={{ width: "100%", height: 190, borderRadius: 16 }}
              />
              <T size={12} muted>
                Photo attachment is local to this phone.
              </T>
            </>
          ) : null}
          {/^https:\/\/\S+$/.test(note.text) ? (
            <Button
              title="Open saved link"
              quiet
              small
              onPress={() => Linking.openURL(note.text)}
            />
          ) : null}
          <Button
            title="Remove"
            quiet
            small
            onPress={() =>
              mutate((d) => {
                d.notes = d.notes.filter((x) => x.id !== note.id);
              })
            }
          />
        </Panel>
      ))}
      {!notes.length ? (
        <T muted size={14}>
          Gift ideas, links, and little things to remember land here.
        </T>
      ) : null}
      {known.length ? (
        <Panel tint={def.tint}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showKnown }}
            onPress={() => setShowKnown(!showKnown)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              minHeight: 40,
            }}
          >
            <Hat id={def.art} size={26} />
            <T bold style={{ flex: 1 }}>
              What Hats knows here · {known.length}
            </T>
            <T bold>{showKnown ? "–" : "+"}</T>
          </Pressable>
          {showKnown
            ? known.map((n) => (
                <Row key={n.id}>
                  <T size={14} style={{ flex: 1 }}>
                    · {n.text}
                  </T>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Forget this"
                    hitSlop={10}
                    onPress={() =>
                      mutate((d) => {
                        d.notes = d.notes.filter((x) => x.id !== n.id);
                      })
                    }
                  >
                    <T muted>✕</T>
                  </Pressable>
                </Row>
              ))
            : null}
        </Panel>
      ) : null}
      {editor.node}
    </Page>
  );
}
