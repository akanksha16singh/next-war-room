/**
 * Role identity and presentation config, copied verbatim from the approved
 * front-end prototype's fixtures (name, title, initials, colours, tabs,
 * greeting copy). This is organisational configuration, not something a
 * news feed can produce, so it stays static in both Demo and Live mode.
 * Only each role's `moments` (which live signals land in their queue) and
 * `kpis` (their numbers) are computed live, see services/dashboardBuilder.js.
 */
const ROLES_STATIC = [
  { id: "brand", name: "Brand", who: "Priya Nair", initials: "PN", color: "#0E1B33", tint: "#EAF0FF", accent: "#1F44D6",
    greeting: "Good evening Priya. Your calls are ready.",
    brief: "Everything below has already been read, argued over and priced. Your job is the judgement, not the homework.",
    scope: "Deodorants and body care, India and global",
    tabs: ["overview", "debate", "creative", "governance", "channels", "ledger"],
    homeDomain: "personal", rail: "What tips this decision" },
  { id: "creative", name: "Creative studio", who: "Arjun Rao", initials: "AR", color: "#0E1B33", tint: "#F0EBFF", accent: "#6A4CE0",
    greeting: "Arjun, your briefs are ready.",
    brief: "Routes come with the brand book already checked and the rights already flagged, so you only make things that can actually ship.",
    scope: "Reactive studio, Mumbai and London",
    tabs: ["overview", "creative", "channels"],
    homeDomain: "beauty", rail: "What you need to make" },
  { id: "legal", name: "Legal and risk", who: "Meera Iyer", initials: "MI", color: "#0E1B33", tint: "#FCECEE", accent: "#C13A4C",
    greeting: "Meera, your gates are waiting on your view.",
    brief: "You see the rules that were touched, who touched them and what is blocked. Nothing publishes past a gate you hold.",
    scope: "India, United Kingdom and Brazil",
    tabs: ["overview", "risk", "governance", "ledger"],
    homeDomain: "personal", rail: "The gates you are holding" },
  { id: "media", name: "Media", who: "Rohit Sen", initials: "RS", color: "#0E1B33", tint: "#EAF0FF", accent: "#1F44D6",
    greeting: "Rohit, your plans are ready to release.",
    brief: "Sequence, spend and reversibility in one view. Anything that cannot be pulled back quickly stays with a person by rule.",
    scope: "Paid and organic, India first",
    tabs: ["overview", "channels", "impact"],
    homeDomain: "personal", rail: "The plan in one look" },
  { id: "supply", name: "Supply chain", who: "Kavya Menon", initials: "KM", color: "#0E1B33", tint: "#E6F7F0", accent: "#0E9F6E",
    greeting: "Kavya, here is what is moving in your rules.",
    brief: "The same engine, pointed at demand and stock. You are told rather than asked, because the move is small and reversible.",
    scope: "South India, general trade",
    tabs: ["overview", "debate", "channels", "governance"],
    homeDomain: "supply", rail: "What actually moves" },
  { id: "leadership", name: "Leadership", who: "Ananya Desai", initials: "AD", color: "#0E1B33", tint: "#F0EBFF", accent: "#6A4CE0",
    greeting: "Ananya, this is the business, not a brand.",
    brief: "No single moment is your problem. What matters is how fast the whole company turns a signal into a decision, what that is worth, and whether the guardrails held while it happened.",
    scope: "Five categories, two functions live",
    tabs: ["portfolio", "board", "impact", "ledger"],
    homeDomain: "personal", rail: "Where the business is exposed" },
];

module.exports = { ROLES_STATIC };
