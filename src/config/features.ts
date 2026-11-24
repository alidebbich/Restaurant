// Feature flags — toggle modules on/off per client deployment
export const features = {
  menu:         true,   // Static menu page
  reservations: true,   // Reservation form (WhatsApp adapter by default)
  ordering:     true,   // Online ordering / cart
  gallery:      true,   // Photo gallery section
  mapEmbed:     false,  // Embedded Google Map (requires API key)
} as const;

