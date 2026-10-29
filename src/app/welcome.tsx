import { useState } from "react";
import { router } from "expo-router";
import { installRoutines } from "../personal/engine";
import { pickBackup } from "../personal/backup";
import { usePersonal } from "../personal/Store";
import { View } from "react-native";
import { Hat } from "../personal/Hat";
import { HAT_IDS, hatDef } from "../personal/model";
import { Button, Field, Page, Panel, T } from "../personal/ui";
export default function Welcome() {
  const { data, mutate, today, replace, say } = usePersonal();
  const [name, setName] = useState(data.preferences.name);
  const [partner, setPartner] = useState(data.preferences.partner);
  return (
    <Page tabs={false}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
        {HAT_IDS.map((h, i) => (
          <Hat key={h} id={hatDef(h).art} size={38} tilt={i % 2 ? 9 : -9} />
        ))}
      </View>
      <View style={{ gap: 4 }}>
        <T display size={30}>
          Your life, with a little more room.
        </T>
        <T muted>Care for your people, your home, and yourself. Privately.</T>
      </View>
      <Panel>
        <T bold size={17}>
          Have your setup file?
        </T>
        <T muted size={14}>
          Brings in your family, pets, routines, and streaks in one tap.
        </T>
        <Button
          title="Import my setup or backup"
          hat="stack"
          onPress={async () => {
            try {
              const next = await pickBackup();
              if (next) {
                await replace(next);
                router.replace("/");
              }
            } catch (e) {
              say(e instanceof Error ? e.message : "Could not import.");
            }
          }}
        />
      </Panel>
      <T bold size={15}>
        Or start fresh
      </T>
      <Field
        label="What should Hats call you?"
        value={name}
        onChangeText={setName}
      />
      <Field
        label="Your partner’s name · optional"
        value={partner}
        onChangeText={setPartner}
      />
      <Button
        title="Make room for what matters"
        hat="cap"
        onPress={() => {
          mutate((d) => {
            d.preferences.name = name.trim();
            d.preferences.partner = partner.trim();
            d.preferences.onboarded = true;
            installRoutines(d, today);
          });
          router.replace("/");
        }}
      />
      <T size={12} muted>
        Just you · encrypted on this phone · sync is optional in Settings.
      </T>
    </Page>
  );
}
