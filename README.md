# LGA Configuration Playbook

A single-page reference for controlling LaGuardia (KLGA) on VATSIM with the vZNY LGA SOP.

**Live site:** https://colef12.github.io/lga-playbook/

## What it does
- Reads VATSIM ATIS for KLGA, KJFK and KEWR (real-world D-ATIS where VATSIM has none) and works out the active LGA configuration, the SOP selection-table check, and Belmont/Coney ownership.
- Playbook pages 1–9: one per runway configuration, from the SOP.
- Page 10: live flight strips for LGA departures from the VATSIM data feed, with the SOP departure procedure, Common Amendments, exit-gate checks, clearance phraseology and a PRD link.
- Test mode and test strips for practising without live traffic.

## Data sources
- VATSIM: `data.vatsim.net/v3/afv-atis-data.json`, `data.vatsim.net/v3/vatsim-data.json`
- Real-world D-ATIS: `atis.info`
- Procedures: vZNY LGA SOP (wiki.nyartcc.org), Rev. 5

For VATSIM use only. Not for real-world navigation or air traffic control.
