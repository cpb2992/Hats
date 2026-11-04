# Hats release checks

These checks supplement the product trial kit. They do not imply a public store release.

## Automated acceptance

The `Hats installed-app and account acceptance` workflow runs for pull requests targeting personal and public branches. It never deploys or receives production secrets.

- A disposable local Supabase stack applies this branch's migrations and creates three temporary Auth users. It exercises actual password sessions and REST/RPC requests, independent private snapshots, stale revisions, family membership, shared task acceptance, care-confirmation transfer, outsider denial and access after leaving. It deletes the test accounts and stops the local stack afterward. This verifies repository schema behavior, not the configuration of the live hosted server or email delivery.
- A release-mode Android APK is compiled for an Android 14 emulator. Sample data enters through the normal backup picker and encrypted save path. A separate disposable Android widget host binds the real installed provider. The test checks a background scheduled notice within a three-minute observation window, offline save/reopen, refresh of the same bound widget after a process restart via a host resize, and notification-permission revocation. It records observed delivery delay; it does not establish exact-to-the-minute delivery or defeat Android battery policies. Its assertions fail the job. The fixture and screenshots contain made-up data only.
- The existing type, lint, app-engine and browser checks remain separate. A browser pass is not a device pass.

## Physical phone confirmation

An emulator result cannot establish Samsung battery-management behavior, Fold hardware posture behavior, or notification presentation under the owner's settings. After an approved personal test update:

1. Reopen Hats and confirm the update is applied. Verify the correct date's plans and a day-change preview.
2. Save one day change, close Hats, reopen it and confirm it remains. Restore the regular day afterward if the change was only a test.
3. Add a harmless commitment a few minutes ahead and leave Hats in the background. Confirm the expected reminder arrives. Check lock-screen privacy under the device's own notification settings.
4. Check the home-screen widget, then fold/unfold and reopen the same date. Verify the widget matches the current relevant plan and its controls open the expected app.
5. In a consensual two-account trial, assign one sample responsibility, accept it from the other account, and confirm both see the owner and acceptance. Keep private notes out of the shared view. Test offline recovery without entering real confidential information.

Record the app version/update identifier, device model, OS version and the specific outcome. Do not substitute a release-mode emulator result for a physical-device result.

## Public rollout information still needed

- The owner must supply the email to publish for support and account-deletion requests. Do not infer it from a commit author or publish an unconfirmed personal address. The privacy file's contact placeholder blocks public rollout.
- Recruit consenting adult working-parent volunteers. No invitations have been sent and no tester results recorded by these changes. The trial kit includes an invitation draft and observation guide; choosing recipients and confirming their consent still require real people.
- Verify the live account/email-provider configuration using designated test accounts, and review the current store listing and store policies before submission.
- Keep personal/public package IDs, update channels and private data separate. Merging to the personal deployment branch sends its OTA; merging to public can send its public test-channel OTA. Do not merge both simply to clear review checks.
