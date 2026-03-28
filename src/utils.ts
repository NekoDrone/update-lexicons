export const didWebToUrl = (did: string): string => {
    const stripped = did.slice("did:web:".length);
    const segments = stripped.split(":");
    const domain = decodeURIComponent(segments[0]);
    if (segments.length > 1) {
        const path = segments.slice(1).join("/");
        return `https://${domain}/${path}/did.json`;
    }
    return `https://${domain}/.well-known/did.json`;
};

export const findAtprotoPds = (
    data: unknown,
): { id: string; type: string; serviceEndpoint: string } | undefined => {
    if (
        typeof data !== "object" ||
        !data ||
        !("service" in data) ||
        typeof data.service !== "object" ||
        !Array.isArray(data.service)
    ) {
        return undefined;
    }
    return data.service.find((service: unknown) => {
        return (
            typeof service === "object" &&
            service &&
            "id" in service &&
            typeof service.id === "string" &&
            service.id === "#atproto_pds" &&
            "type" in service &&
            typeof service.type === "string" &&
            service.type === "AtprotoPersonalDataServer"
        );
    }) as { id: string; type: string; serviceEndpoint: string } | undefined;
};
