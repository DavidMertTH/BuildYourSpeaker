<script>
  function openImportExportDialog() {
    window.dispatchEvent(new CustomEvent("cabio:project-action", { detail: { action: "open-import-export" } }));
  }
</script>

<div class="sidebar-footer">
  <button id="importExportButton" type="button" onclick={openImportExportDialog}>Import / Export</button>
  <div class="legal-footer-stack">
    <details class="imprint-footer">
      <summary>Impressum</summary>
      <address>
        <strong>David Mertens</strong><br />
        Olpener Strasse 101<br />
        51107 Koeln<br />
        Deutschland<br />
        <a href="mailto:davidmertenskontakt@gmail.com">davidmertenskontakt@gmail.com</a>
      </address>
    </details>
    <details class="privacy-footer">
      <summary>Datenschutz</summary>
      <div class="legal-footer-text">
        <p>
          Stand: 21. Juni 2026. Verantwortlich fuer diese Website ist David
          Mertens, Olpener Strasse 101, 51107 Koeln, Deutschland,
          <a href="mailto:davidmertenskontakt@gmail.com">davidmertenskontakt@gmail.com</a>.
        </p>
        <p>
          Beim Aufruf der Website verarbeitet der Hosting-Anbieter Render Services,
          Inc. technische Zugriffsdaten, z. B. IP-Adresse, Datum und Uhrzeit,
          aufgerufene Dateien, Referrer, Browser- und Betriebssysteminformationen.
          Diese Verarbeitung dient der Auslieferung, Stabilitaet und Sicherheit der
          Website. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.
        </p>
        <p>
          Render verarbeitet Daten auch in den USA. Fuer diese Verarbeitung werden nach
          Angaben von Render ein Data Processing Addendum, geeignete Garantien und
          Unterauftragsverarbeiter eingesetzt:
          <a href="https://render.com/dpa" target="_blank" rel="noopener noreferrer">render.com/dpa</a>,
          <a href="https://render.com/privacy" target="_blank" rel="noopener noreferrer">render.com/privacy</a>.
        </p>
        <p>
          Die App speichert Projekte, Einstellungen, Layouts und die 3D-Ansicht lokal
          im Browser des jeweiligen Geraets. Diese Daten werden nicht automatisch an
          den Server uebertragen und koennen ueber Browserdaten/Website-Daten geloescht
          werden. Importierte Mess- und Projektdateien werden im Browser verarbeitet.
        </p>
        <p>
          Bei der Driver-, Passive-Radiator- und Frequenzgang-Suche werden Suchbegriffe
          an den Server uebertragen. Der Server fragt dafuer externe Quellen wie
          DuckDuckGo, Parts Express und Loudspeaker Database ab. Bitte keine
          vertraulichen oder personenbezogenen Inhalte in Suchfelder eingeben.
        </p>
        <p>
          Diese Website verwendet derzeit keine Analyse-Cookies, kein Tracking, keine
          Werbung, keine Nutzerkonten und keinen Newsletter. Kontaktanfragen per E-Mail
          werden zur Bearbeitung der Anfrage verarbeitet.
        </p>
        <p>
          Betroffene Personen haben nach Massgabe der DSGVO Rechte auf Auskunft,
          Berichtigung, Loeschung, Einschraenkung, Datenuebertragbarkeit und Widerspruch
          sowie ein Beschwerderecht bei einer Datenschutzaufsichtsbehoerde.
        </p>
      </div>
    </details>
  </div>
</div>
