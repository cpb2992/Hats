import type { HatArtId } from "./hatArt";

export interface HatPackage {
  id: string;
  name: string;
  art: HatArtId;
  subtitle: string;
  block: string;
  tools: string[];
  checklists: { title: string; minutes: number; steps: string[] }[];
  shortcut?: "school" | "meals";
}
/** Tool descriptions name only features that exist in this version. */
export const HAT_PACKAGES: HatPackage[] = [
  { id: "teacher", name: "Teacher", art: "mortarboard", subtitle: "Less to take home after the last bell.", block: "Teaching block",
    tools: ["Class schedule & Prep Mode", "Lesson and classroom checklists", "Teaching blocks"], shortcut: "school",
    checklists: [
      { title: "Prepare a lesson", minutes: 20, steps: ["Choose the learning goal", "Prepare materials", "Plan supports and extensions", "Choose a quick check for understanding"] },
      { title: "Close out the school day", minutes: 10, steps: ["Save where each class finished", "List tomorrow’s materials", "Choose the first task for the next prep"] },
    ] },
  { id: "chef", name: "Chef", art: "chef", subtitle: "Your recipes. Your prep. A calmer service.", block: "Kitchen shift",
    tools: ["Recipes, meal preferences & groceries", "Prep and service checklists", "Kitchen shifts"], shortcut: "meals",
    checklists: [
      { title: "Build a prep list", minutes: 15, steps: ["Review the menu", "Check ingredients on hand", "List missing ingredients", "Order prep by what takes longest"] },
      { title: "Close the kitchen", minutes: 15, steps: ["Follow the kitchen’s closing checklist", "Record restocking needs", "Leave tomorrow’s prep notes"] },
    ] },
  { id: "police", name: "Police Officer", art: "captain", subtitle: "Keep your shifts and follow-through together.", block: "Duty shift",
    tools: ["Duty shifts, including overnight", "Personal start and end-of-shift lists", "Training and admin reminders"],
    checklists: [
      { title: "Get ready for duty", minutes: 10, steps: ["Review the roster and assignment", "Use the department’s required readiness checklist", "Check personal appointments around the shift"] },
      { title: "Finish shift admin", minutes: 15, steps: ["Complete required work in the department system", "Note personal follow-ups without case details", "Confirm the next shift"] },
    ] },
  { id: "firefighter", name: "Firefighter", art: "firefighter", subtitle: "Make room for duty, training, and recovery.", block: "Station shift",
    tools: ["Overnight and 24-hour shifts", "Station and training checklists", "Post-shift personal planning"],
    checklists: [
      { title: "Start a station shift", minutes: 15, steps: ["Confirm the assignment and briefing", "Follow the station’s required equipment checks", "Review scheduled training"] },
      { title: "Close out a station shift", minutes: 10, steps: ["Finish the station’s handover process", "Record personal admin follow-ups", "Plan food, travel, and rest after duty"] },
    ] },
  { id: "driver", name: "Driver", art: "newsboy", subtitle: "A clear plan before you head out.", block: "Driving shift",
    tools: ["Driving shifts", "Editable stop-by-stop task lists", "Vehicle and paperwork reminders"],
    checklists: [
      { title: "Plan a driving day", minutes: 15, steps: ["List stops in the order you choose", "Confirm addresses and time windows", "Plan breaks", "Use the required vehicle checklist"] },
      { title: "Wrap up the route", minutes: 10, steps: ["Finish required delivery records", "Save receipts in your work system", "Note vehicle maintenance follow-ups"] },
    ] },
  { id: "trades", name: "Tradesperson", art: "hardhat", subtitle: "Get the tools, materials, and next job lined up.", block: "Job block",
    tools: ["Scheduled job blocks", "Materials and job checklists", "Quote and client follow-up tasks"],
    checklists: [
      { title: "Prepare a job", minutes: 20, steps: ["Confirm the scope and arrival time", "List materials and tools", "Check access and site requirements", "Review the job plan"] },
      { title: "Finish a job", minutes: 15, steps: ["Review the finished work with the client", "Complete required records", "Send the invoice in your billing system", "Set any follow-up date"] },
    ] },
  { id: "nurse", name: "Nurse", art: "cap", subtitle: "Keep work and life around your shifts in view.", block: "Nursing shift",
    tools: ["Day and night shifts", "Personal shift-preparation lists", "Training and renewal reminders"],
    checklists: [
      { title: "Prepare for a shift", minutes: 10, steps: ["Confirm the roster and commute", "Pack food and personal essentials", "Review personal training deadlines"] },
      { title: "Reset after a shift", minutes: 10, steps: ["Finish required handover in the work system", "Check the next rostered shift", "Plan personal errands and rest"] },
    ] },
  { id: "business", name: "Business Owner", art: "bowler", subtitle: "Keep client promises and business admin moving.", block: "Business block",
    tools: ["Client and admin time blocks", "Weekly business checklists", "Follow-up tasks"],
    checklists: [
      { title: "Weekly business review", minutes: 25, steps: ["Review client promises", "Check invoices in your billing system", "Choose the week’s priorities", "Schedule follow-ups"] },
      { title: "Follow up with a client", minutes: 10, steps: ["Review the last conversation", "Write the next useful action", "Send through your usual channel", "Set a follow-up date"] },
    ] },
  { id: "coach", name: "Coach", art: "visor", subtitle: "Arrive with a session plan and leave with the next step.", block: "Coaching session",
    tools: ["Session blocks", "Practice and equipment checklists", "Session follow-up tasks"],
    checklists: [
      { title: "Plan a practice", minutes: 20, steps: ["Choose the session goal", "Plan activities and timing", "Check equipment and venue", "Plan adjustments for the group"] },
      { title: "Review a session", minutes: 10, steps: ["Note what worked", "Choose what to revisit", "Set the next session’s focus"] },
    ] },
  { id: "creative", name: "Creative", art: "beret", subtitle: "Protect making time and finish what matters.", block: "Creative session",
    tools: ["Creative time blocks", "Project and release checklists", "Ideas and next-action tasks"],
    checklists: [
      { title: "Move a project forward", minutes: 25, steps: ["Choose one concrete outcome", "Gather the materials", "Make a first pass", "Save the next step before stopping"] },
      { title: "Prepare to share work", minutes: 15, steps: ["Review the final version", "Check credits and permissions", "Prepare the description", "Choose where and when to share"] },
    ] },
];
export const packageById = (id: unknown) => HAT_PACKAGES.find((p) => p.id === id);
