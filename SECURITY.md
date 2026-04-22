# Security policy

The tool has been tested using virustotal and is malware free as of
the latest release.

Static security scan produced zero occurrences of fetch(, XMLHttpRequest, 
WebSocket, sendBeacon, EventSource, eval(, new Function(, string-form 
setTimeout/setInterval. 

All 10 innerHTML sites have been inspected — user-derived strings (error messages, warnings) 
are wrapped in the file's existing escapeHtml() helper (standard 5-char escaper for & < > " '). 

External URLs in the file are limited to the three SRI'd CDN tags, the pdf.js worker 
(can't take SRI — browser limitation), and static links to Apache licence, cyber.gov.au, 
and the author's LinkedIn profile.

If you find a security issue in this tool — for example a way for a
malicious file to execute code in the user's browser, or a way for the
tool to leak data off the client — please report it privately rather than
opening a public GitHub issue.

Email: via LinkedIn DM to <https://www.linkedin.com/in/gauravvikash/>

I'll acknowledge within a few days, work with you on a fix, and credit
you in the release notes unless you prefer to stay anonymous.

Please do not attach real SSP-As, CCMs or customer data to your report.
Redact identifiers and wording, or reproduce the issue using the sample
files in `samples/`.
