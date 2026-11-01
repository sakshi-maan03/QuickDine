/** Turns "Bella Nosh Cafe & Lounge" into "bella-nosh-cafe-lounge" for use in URLs. */
export function slugify(text: string): string {
    const slug = text
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "") // strip accents: é → e
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-") // anything that isn't a letter/number becomes a dash
        .replace(/^-+|-+$/g, ""); // no dashes at the start or end

    return slug || "restaurant";
}
