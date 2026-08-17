# Hazards Roadmap

Hazards is a public, no-login web app for helping Calapan residents understand local hazard-risk zones and recently reported incidents.

## Product Principles

- Show risk zones and current incidents as separate concepts.
- Prefer authoritative data and always show its source and freshness.
- Use clear labels alongside map colors.
- Do not present a risk zone as proof that an incident is happening now.
- Keep the app useful on mobile and on slower devices.

## Phase 0: Data Validation

- Confirm Calapan City and barangay boundary data.
- Find and verify an authoritative flood-risk dataset.
- Verify an official source for incidents reported during the past 24 hours.
- Confirm terrain and other data needed for a useful 3D view.
- Check data licensing, attribution, coverage, timestamps, and update frequency.
- Identify the official emergency contacts and safety guidance to display.

## Phase 1: MVP

The first release serves residents and focuses on flooding.

- 3D map centered on Calapan City.
- 2D map mode using the same data layers as the 3D view.
- Calapan City and barangay boundaries.
- Flood-risk layer with a labeled severity legend and adjustable opacity.
- Barangay search and clickable area details.
- Area details showing risk level, explanation, source, and update dates.
- Separate map layer and panel for verified official events from the past 24 hours.
- Event timestamps, location, severity, status, source, and source link when available.
- Clear states for no verified events, stale data, and unavailable sources.
- Short, authoritative flood-safety guidance and emergency contacts.
- Responsive, keyboard-accessible controls and a mobile-friendly details panel.

## Future Hazard Layers

Add these one at a time after suitable authoritative datasets are available:

- Earthquake
- Landslide
- Storm surge
- Tsunami
- Typhoon and wind hazards

Each layer should document what its classifications mean, when it was updated, and what its limitations are.

## Later Enhancements

- Historical event browsing and a time filter.
- Better 3D terrain and building visualization when reliable data is available.
- A data ingestion or review tool for feeds that require local validation.
- Additional official hazard advisories.

## Non-Goals For The First Release

- User accounts or sign-in.
- Crowdsourced incident reports.
- Push notifications.
- Predictive hazard forecasting.
- Property-level risk guarantees.
- Evacuation routing or unverified evacuation-center information.
- A large administrative dashboard.
- Adding hazard layers without reliable supporting data.
