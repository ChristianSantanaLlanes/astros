export const OWNERS: { name: string; initials: string; color: string }[] = [
  { name: "Karri", initials: "KA", color: "#5e6ad2" },
  { name: "Lena", initials: "LE", color: "#eb5757" },
  { name: "Andreas", initials: "AN", color: "#27a644" },
  { name: "Jori", initials: "JO", color: "#f2994a" },
  { name: "Tuomas", initials: "TU", color: "#26b5ce" },
];

export function ownerFor(number: number): (typeof OWNERS)[number] {
  return OWNERS[number % OWNERS.length]!;
}

export function ownerOf(idea: { number: number; assignee?: string }): (typeof OWNERS)[number] {
  if (idea.assignee) {
    return OWNERS.find((owner) => owner.name === idea.assignee) ?? ownerFor(idea.number);
  }
  return ownerFor(idea.number);
}
