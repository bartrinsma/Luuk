import { Document, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { kindLabel, type ShareReport } from "@/lib/report";

/**
 * Printklaar A4-rapport. Ingebouwde Helvetica: geen font-downloads, werkt offline.
 * (Helvetica kent geen emoji of pijltjes — die gebruiken we hier dus niet.)
 */

const OBSIDIAN = "#0A0A0A";
const CYAN = "#00B8CC"; // iets donkerder dan #00E5FF, zodat het leesbaar print op wit
const MUTED = "#71717A";
const LINE = "#E4E4E7";

const s = StyleSheet.create({
  page: { paddingBottom: 64, fontFamily: "Helvetica", fontSize: 10, color: OBSIDIAN, backgroundColor: "#FFFFFF" },
  watermark: {
    position: "absolute",
    top: 360,
    left: -40,
    width: 700,
    textAlign: "center",
    fontSize: 120,
    fontFamily: "Helvetica-Bold",
    color: "#F4F4F5",
    transform: "rotate(-30deg)",
  },
  header: { backgroundColor: OBSIDIAN, paddingHorizontal: 40, paddingTop: 34, paddingBottom: 30 },
  brandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  brand: { fontFamily: "Helvetica-Bold", fontSize: 40, color: "#FFFFFF", letterSpacing: -1 },
  brandSi: { color: "#00E5FF" },
  tagline: { fontSize: 10, color: "#A1A1AA", marginTop: 4 },
  kind: { fontSize: 9, color: "#00E5FF", letterSpacing: 2, textTransform: "uppercase", textAlign: "right" },
  date: { fontSize: 9, color: "#A1A1AA", textAlign: "right", marginTop: 3 },
  body: { paddingHorizontal: 40, paddingTop: 28 },
  subject: { fontFamily: "Helvetica-Bold", fontSize: 18 },
  subtitle: { fontSize: 11, color: MUTED, marginTop: 3 },
  stamp: {
    borderWidth: 2,
    borderColor: CYAN,
    color: CYAN,
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    letterSpacing: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    textTransform: "uppercase",
    transform: "rotate(-4deg)",
  },
  headlineBox: { marginTop: 22, flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1, borderColor: LINE, paddingVertical: 18 },
  headlineCol: { flex: 1 },
  label: { fontSize: 8, color: MUTED, letterSpacing: 1.5, textTransform: "uppercase" },
  headline: { fontFamily: "Helvetica-Bold", fontSize: 40, marginTop: 6, letterSpacing: -1 },
  secondary: { fontFamily: "Helvetica-Bold", fontSize: 22, marginTop: 10, color: CYAN },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: MUTED, marginTop: 26, marginBottom: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  fact: { width: "48.5%", flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: 1, borderColor: LINE },
  factLabel: { color: MUTED, flexDirection: "row", alignItems: "center" },
  factValue: { fontFamily: "Helvetica-Bold" },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  verdict: { marginTop: 28, backgroundColor: "#ECFEFF", borderLeftWidth: 4, borderColor: CYAN, padding: 18, borderRadius: 4 },
  verdictHead: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: { width: 22, height: 22, borderRadius: 5, backgroundColor: OBSIDIAN, color: "#00E5FF", fontFamily: "Helvetica-Bold", fontSize: 12, textAlign: "center", paddingTop: 5, marginRight: 8 },
  verdictTitle: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  verdictText: { fontSize: 13, lineHeight: 1.5, fontFamily: "Helvetica-Oblique" },
  note: { marginTop: 18, fontSize: 8, color: MUTED, lineHeight: 1.4 },
  link: { color: CYAN, textDecoration: "none" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderColor: LINE,
    paddingTop: 8,
    fontSize: 8,
    color: MUTED,
  },
});

export function ReportPdf({ report, url, generatedAt }: { report: ShareReport; url: string; generatedAt: Date }) {
  const date = generatedAt.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });

  return (
    <Document title={`Luuk.si — ${report.subject}`} author="Luuk.si" subject={kindLabel(report.kind)} creator="Luuk.si">
      <Page size="A4" style={s.page}>
        <Text style={s.watermark} fixed>
          Luuk.si
        </Text>

        <View style={s.header}>
          <View style={s.brandRow}>
            <View>
              <Text style={s.brand}>
                Luuk<Text style={s.brandSi}>.si</Text>
              </Text>
              <Text style={s.tagline}>Ask Luuk? Sí!</Text>
            </View>
            <View>
              <Text style={s.kind}>{kindLabel(report.kind)}</Text>
              <Text style={s.date}>{date}</Text>
            </View>
          </View>
        </View>

        <View style={s.body}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={s.subject}>{report.subject}</Text>
              <Text style={s.subtitle}>{report.subtitle}</Text>
            </View>
            {report.stamp && <Text style={s.stamp}>{report.stamp}</Text>}
          </View>

          <View style={s.headlineBox}>
            <View style={s.headlineCol}>
              <Text style={s.label}>{report.headline.label}</Text>
              <Text style={s.headline}>{report.headline.value}</Text>
            </View>
            {report.secondary && (
              <View style={[s.headlineCol, { alignItems: "flex-end" }]}>
                <Text style={s.label}>{report.secondary.label}</Text>
                <Text style={s.secondary}>{report.secondary.value}</Text>
              </View>
            )}
          </View>

          <Text style={s.sectionTitle}>De data</Text>
          <View style={s.grid}>
            {report.facts.map((f, i) => (
              <View key={`${f.label}-${i}`} style={s.fact} wrap={false}>
                <View style={s.factLabel}>
                  {f.ok !== undefined && <View style={[s.dot, { backgroundColor: f.ok ? "#16A34A" : "#E11D48" }]} />}
                  <Text>{f.label}</Text>
                </View>
                <Text style={s.factValue}>{f.value}</Text>
              </View>
            ))}
          </View>

          <View style={s.verdict} wrap={false}>
            <View style={s.verdictHead}>
              <Text style={s.avatar}>L</Text>
              <Text style={s.verdictTitle}>{report.verdictTitle}</Text>
            </View>
            <Text style={s.verdictText}>&ldquo;{report.verdict}&rdquo;</Text>
          </View>

          <Text style={s.note}>
            {report.dataNote} Indicatie, geen financieel advies. Volledige analyse:{" "}
            <Link src={url} style={s.link}>
              {url}
            </Link>
          </Text>
        </View>

        <View style={s.footer} fixed>
          <Text>Gegenereerd door Luuk.si - De waarheid op papier.</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
