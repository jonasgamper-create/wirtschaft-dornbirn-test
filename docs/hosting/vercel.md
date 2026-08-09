# Hosting-Entscheidung

Vercel Pro ist für den professionellen Preview-/Produktionsworkflow geeignet.
Der öffentliche GitHub-Pages-Workflow bleibt für diese Repositoryfassung eine
nicht indexierte Testumgebung.

Vercel verfügt über die Compute-Region Frankfurt (`fra1`), aber ein globales CDN
und weitere Dienstverarbeitung. Eine EU-Compute-Region ist daher keine pauschale
Garantie vollständiger EU-Datenresidenz. Vercel DPA, Subprozessoren, Regionen und
die konkrete Kundenkonfiguration müssen je Kunde geprüft werden.

Empfehlung: Vercel-Team im Kundenkonto oder in einer klar dokumentierten
Geschäftsorganisation, keine geteilten Logins, Produktion nur nach Pull-Request-
Freigabe. Für SSO, Audit, SLA oder formale Datenresidenzanforderungen Enterprise
individuell bewerten.

- [Vercel Pricing](https://vercel.com/pricing)
- [Vercel Regions](https://vercel.com/docs/regions)
- [Vercel DPA](https://vercel.com/legal/dpa)
- [GitHub Pages Limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
