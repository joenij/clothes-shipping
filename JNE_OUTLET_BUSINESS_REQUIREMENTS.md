# JNE OUTLET - BUSINESS REQUIREMENTS
**Updated:** October 15, 2025
**Platform Vision:** Multi-Vendor Dropshipping Platform (wie Shein, Temu, Amazon)

---

## 🎯 PLATFORM VISION

JNE Outlet ist **KEINE einzelne E-Commerce Website**, sondern eine **Multi-Vendor Dropshipping Plattform**:

- **Vergleichbar mit:** Shein, Temu, Amazon Marketplace
- **Ziel:** Anderen ermöglichen, ins Business einzusteigen
- **Architektur:** Multi-Tenant, skalierbar, enterprise-grade
- **Flexibilität:** Alle Integrationen müssen mehrere Anbieter unterstützen

---

## 📦 INVENTAR-STRATEGIE

### Aktueller Status:
- ❌ **KEIN eigenes Lager vorhanden** (Stand: Oktober 2025)
- ⏳ **Paralleler Aufbau geplant:** Eigenes Lager + Dropshipping gleichzeitig

### Fulfillment-Zeiten:
| Quelle | Lieferzeit | Status |
|--------|-----------|--------|
| Eigenes Lager (EU) | 72 Stunden | ⏳ In Aufbau |
| Dropshipping EU | 72 Stunden | ✅ Geplant |
| Dropshipping China | 2 Wochen | ✅ Geplant |

### Sourcing-Quellen:
1. **Eigenes Lager** (wenn vorhanden)
2. **EU Dropshipping Partner** (schnelle Lieferung)
3. **China Dropshipping Partner** (große Auswahl, längere Lieferzeit)

---

## 🤝 SUPPLIER-MANAGEMENT

### Supplier-Anzahl:
- **Aktuell:** ~10 Supplier geplant
- **Ziel:** Flexibel erweiterbar, unbegrenzte Supplier-Anzahl möglich
- **Namen:** Noch nicht final definiert (in Klärung)

### Integration-Methoden (ALLE müssen unterstützt werden):

#### 1. Email-Kommunikation ✅ MANDATORY
- Automatische Email-Benachrichtigung bei neuer Order
- Email-Parsing für Status-Updates (optional)
- Template-basierte Email-Generation

#### 2. API-Integration ✅ MANDATORY
- RESTful API Adapter-Pattern
- Webhook-Support für Status-Updates
- OAuth/API-Key Authentication
- Rate-Limiting und Retry-Logic

#### 3. CSV/Excel Import/Export ✅ MANDATORY
- Automated CSV Import (FTP/SFTP/Email Attachment)
- Excel-Format Support (.xlsx, .xls)
- Flexible Column-Mapping
- Scheduled Import Jobs

#### 4. Supplier-Portal ✅ MANDATORY
- Web-Interface für Supplier
- Order-Inbox mit Accept/Reject
- Inventory-Management
- Performance-Dashboard

### Supplier-Daten:
- Company Name
- Contact Person
- Email, Phone
- Integration Method(s) - **MULTI-SELECT möglich!**
- API Credentials (encrypted)
- Performance Metrics (Rating, Fulfillment Time, Defect Rate)

---

## 🔀 ORDER ROUTING

### Routing-Priority:
**WICHTIG:** ALLE Orders sind gleich wichtig! Keine Order-Priorisierung nach Kunden oder Wert.

### Routing-Logik:
```
1. Check Stock Availability
   - Query ALL sources (own warehouse, all suppliers)
   - Check real-time stock levels

2. Select Optimal Source
   - Criteria: Stock Available, Supplier Rating, Price, Delivery Time, Location
   - Algorithm: Weighted scoring system
   - NOT first-come-first-serve!

3. Route Order
   - Create supplier_order entry
   - Send notification (Email/API/Portal)
   - Reserve inventory

4. Exception Handling
   - No stock anywhere → Manual review
   - Supplier rejection → Auto-reroute to backup supplier
   - Quality issues → Flag for admin review
```

### Multi-Supplier Orders:
- **Split orders** wenn Produkte von verschiedenen Supplier kommen
- Kunde bekommt EINE Order-Number
- Backend trackt multiple `supplier_orders`
- Separates Tracking pro Supplier-Order

---

## 🛍️ PRODUKT-KATEGORIEN

### Erlaubte Kategorien:
- ✅ **Clothes:** T-Shirts, Jeans, Dresses, Jackets, etc.
- ✅ **Fashion Accessories:** Bags, Belts, Sunglasses, Jewelry
- ✅ **Shoes:** Sneakers, Boots, Sandals, etc.
- ✅ **Home & Living:** (nach Review)
- ✅ **Beauty & Cosmetics:** (nach Review)
- ✅ **Sports & Outdoor:** (nach Review)

### Eingeschränkte Kategorien:
- ⚠️ **Elektronik:**
  - Nur nach Review!
  - CE-Kennzeichnung MANDATORY
  - Compliance-Check erforderlich
  - Garantie- und Return-Policy klar definieren

### Verbotene Kategorien:
- ❌ Genehmigungspflichtige Güter (Waffen, Medikamente, etc.)
- ❌ Gefälschte Markenware
- ❌ Jugendgefährdende Inhalte

### Prozess für neue Kategorien:
```
1. Kategorie-Vorschlag
2. Legal & Compliance Review
3. Margin-Analyse
4. Supplier-Verfügbarkeit prüfen
5. Test-Produkte auflisten (limited)
6. Bei Erfolg: Full rollout
```

---

## 💰 MARGIN-REGELN

### Generelle Prinzipien:
- **Flexibel pro Kategorie:** Verschiedene Margen für verschiedene Produktgruppen
- **Minimum Enforcement:** System verhindert Verkauf unter Minimum-Margin
- **Dynamic Pricing:** Optional für zukünftige Implementierung

### Clothes (Initial)
| Margin Type | Percentage | Example |
|-------------|-----------|---------|
| **Minimum** | 35% | Supplier: €10 → Retail: €15.38 |
| **Target** | 45% | Supplier: €10 → Retail: €18.18 |
| **Premium** | 55% | Supplier: €10 → Retail: €22.22 |

### Andere Kategorien:
**Status:** Noch nicht definiert

**Prozess:**
1. Kategorie-spezifische Margin-Analyse
2. Wettbewerbs-Recherche
3. Margin-Regeln definieren
4. Im System konfigurieren

**Beispiel-Kategorien (Platzhalter):**
- Electronics: 15-25% (niedrige Margen, hoher Wettbewerb)
- Jewelry: 50-70% (hohe Margen möglich)
- Accessories: 40-60%

---

## 🚚 FULFILLMENT & LOGISTICS

### 3PL / Fulfillment Partner:
- ❌ **Aktuell:** KEIN 3PL Partner
- ⏳ **Status:** In Aufbau / Verhandlung
- 🎯 **Ziel:** Flexible Integration mehrerer Partner

**Potentielle Partner:**
- ShipBob
- Amazon FBA
- Eigenes Warehouse (wenn aufgebaut)
- Andere 3PL Anbieter

### Shipping Partner (ALLE müssen unterstützt werden):

#### Adapter-Pattern erforderlich!

| Partner | Priority | Use Case |
|---------|---------|----------|
| **DHL** | 🥇 Bevorzugt | Eigenes Dropshipping, EU, International |
| **DPD** | 🥈 Alternative | EU, Backup für DHL |
| **Hermes** | 🥉 Alternative | DE, AT, Budget-Option |
| **Weitere** | 🔄 Flexibel | UPS, FedEx, GLS, Regionalpartner |

### Shipping Integration Requirements:
```javascript
// Generic Shipping Adapter Interface
interface ShippingAdapter {
  createShipment(order, address): Promise<Shipment>
  getTrackingInfo(trackingNumber): Promise<TrackingData>
  cancelShipment(shipmentId): Promise<boolean>
  calculateRates(fromAddress, toAddress, weight): Promise<Rate[]>
  generateLabel(shipmentId): Promise<LabelPDF>
}

// Implementations:
- DHLAdapter implements ShippingAdapter
- DPDAdapter implements ShippingAdapter
- HermesAdapter implements ShippingAdapter
- GenericShippingAdapter implements ShippingAdapter (Fallback)
```

**NIEMALS direkt auf einen Partner festlegen!**

---

## 🌍 SHIPPING ZONES (Rollout-Plan)

### Phase 1: EU (Aktiv) ✅
- **Status:** Live seit 7 Wochen
- **Länder:** Deutschland, Österreich, Niederlande, Belgien, Frankreich, Italien, etc.
- **Delivery Time:** 3-7 Tage (DHL)

### Phase 2: Namibia (+3-6 Monate) ⏳
- **Geplant:** Q1-Q2 2026
- **Currency:** NAD (Namibian Dollar)
- **Challenges:** Customs, längere Lieferzeiten
- **Shipping:** DHL International

### Phase 3: Brazil (+6-12 Monate) ⏳
- **Geplant:** Q2-Q3 2026
- **Currency:** BRL (Brazilian Real)
- **Challenges:** Import Taxes, Customs, komplexe Regulierung
- **Shipping:** DHL, lokale Partner

---

## 🚀 ENTWICKLUNGS-PRIORITÄT

### Priorität 1: Web Frontends perfektionieren ✅ JETZT
**Ziel:** Shop, Admin Panel, Supplier Portal production-ready

**Shop Frontend (shop.jneoutlet.com):**
- [ ] Complete checkout flow
- [ ] Real payment integration (Stripe live mode)
- [ ] Order tracking UI
- [ ] Customer account management
- [ ] Wishlist functionality
- [ ] Advanced product filters
- [ ] Product reviews

**Admin Panel (admin.jneoutlet.com):**
- [ ] Remove ALL demo/hardcoded data
- [ ] Order routing dashboard
- [ ] Supplier order management
- [ ] Supplier performance dashboard
- [ ] Pricing rule management
- [ ] RMA management
- [ ] Real analytics (not mocked)

**Supplier Portal (supplier.jneoutlet.com):**
- [ ] Order fulfillment workflow
- [ ] Accept/Reject orders
- [ ] Tracking number entry
- [ ] Inventory management
- [ ] Performance metrics (real data)
- [ ] Communication with admin

### Priorität 2: Mobile Apps (iOS/Android) ⏸️ SPÄTER
**Status:** Off-focus bis Web Frontends fertig

**Wann starten:**
- Wenn Web Frontends stabil laufen
- Wenn erste Orders erfolgreich abgewickelt
- Wenn Business-Model validiert

### Priorität 3: DatingApp ⏸️ OFF FOCUS
**Status:** Separate sessions, nicht Teil von JNE Outlet Entwicklung

---

## 🛠️ TECHNISCHE ANFORDERUNGEN

### Flexibilität = Mandatory

**Alle Integrationen MÜSSEN:**
1. **Adapter-Pattern** verwenden (niemals direkt auf einen Anbieter festlegen)
2. **Configuration-Driven** sein (neue Anbieter ohne Code-Änderung hinzufügen)
3. **Fallback-Support** haben (wenn primärer Anbieter ausfällt)
4. **Multi-Provider** unterstützen (mehrere gleichzeitig aktiv)

### Database Schema Requirements:
- **Flexible Enums:** Supplier integration methods, shipping carriers, etc.
- **JSONB Configuration:** Für provider-spezifische Settings
- **Extensible:** Neue Felder ohne Migration hinzufügen können
- **Multi-Tenant Ready:** Prepared für zukünftige Multi-Vendor Platform

### API Requirements:
- **RESTful:** Standard REST conventions
- **Webhooks:** Für asynchrone Updates
- **Rate Limiting:** Pro Supplier/Partner
- **Authentication:** Multiple methods (API Key, OAuth, JWT)

---

## 📊 SUCCESS METRICS

### Business Metrics:
- **Order Routing:** 95%+ automated (manual review < 5%)
- **Supplier Fulfillment:** 90%+ on-time
- **Customer Satisfaction:** ≥ 4.5/5
- **Return Rate:** < 5%

### Technical Metrics:
- **API Response Time:** p95 < 200ms
- **Uptime:** 99.9%
- **Test Coverage:** ≥ 85% backend, ≥ 70% frontend
- **Deployment Frequency:** Weekly

### Platform Metrics (Future):
- **Active Vendors:** Target 100+ vendors in Year 2
- **GMV (Gross Merchandise Value):** Growth tracking
- **SKU Count:** Target 10,000+ products

---

## 🔐 COMPLIANCE & LEGAL

### EU Requirements:
- ✅ GDPR Compliance
- ✅ Distance Selling Regulations
- ✅ Consumer Protection Laws
- ✅ VAT Handling

### Product Safety:
- ⚠️ CE Marking (Electronics)
- ⚠️ Product Liability Insurance
- ⚠️ REACH Compliance (Chemicals)

### Platform Responsibility:
- Supplier Verification Process
- Product Compliance Checks
- Customer Protection Policies
- Dispute Resolution Process

---

## 📅 TIMELINE & MILESTONES

### Q4 2025 (October - December)
- ✅ Complete Web Frontends
- ✅ Dropshipping Core Backend
- ✅ First 3-5 Suppliers onboarded
- ✅ First real orders processed

### Q1 2026 (January - March)
- ⏳ Mobile Apps Development starts
- ⏳ Namibia expansion preparation
- ⏳ Scale to 10 suppliers

### Q2 2026 (April - June)
- ⏳ Mobile Apps launch (iOS + Android)
- ⏳ Namibia market launch
- ⏳ 3PL Partner integration

### Q3 2026 (July - September)
- ⏳ Brazil market preparation
- ⏳ Platform features for multi-vendor

### Q4 2026 (October - December)
- ⏳ Brazil market launch
- ⏳ Multi-vendor platform beta

---

**Document Status:** ✅ FINAL
**Last Updated:** October 15, 2025
**Next Review:** November 15, 2025
