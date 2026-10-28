import { useState } from "react";
import { router } from "expo-router";
import { installRoutines } from "../personal/engine";
import { pickBackup } from "../personal/backup";
import { usePersonal } from "../personal/Store";
import { Button, Field, Page, Panel, Row, T } from "../personal/ui";
export default function Welcome() {
  const { data, mutate, today, replace, say } = usePersonal();
  const [name, setName] = useState(data.preferences.name);
  const [partner, setPartner] = useState(data.preferences.partner);
  return (
    <Page tabs={false}>
      <T display size={32}>
        hats.
      </T>
      <T display size={44}>
        {"Your life.\nA little more room."}
      </T>
      <T size={18} muted>
        A private place to care for your people, your home, and yourself.
      </T>
      <Panel>
        <T bold size={22}>
          Already have your personal setup?
        </T>
        <T muted>
          Import it once to bring in your family, pets, preferences, and
          routines. Your old Hats data stays untouched.
        </T>
        <Button
          title="Import my setup or backup"
          icon="doc"
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
      <Row>
        <T size={12} muted>
          Just you. No partner signup. No work tasks.
        </T>
      </Row>
      <T size={12} muted>
        The installed app protects local data with encryption. Connect your
        private account in Settings for sync and recovery. Browser previews use
        browser storage.
      </T>
    </Page>
  );
}
