#set document(title: "Samantha Hughes Resume", author: "Samantha Hughes")
#set page(paper: "us-letter", margin: (x: 0.6in, y: 0.5in))
#set text(font: "IBM Plex Sans", size: 9.75pt, fill: rgb("#111111"))
#set par(leading: 0.55em, spacing: 0.6em)
#set list(indent: 0.2em, body-indent: 0.5em, spacing: 0.45em)
#show link: set text(fill: rgb("#1a4f8a"))
#show heading.where(level: 1): it => block(below: 0.4em, text(size: 20pt, weight: "bold", it.body))
#show heading.where(level: 2): it => block(above: 0.9em, below: 0.45em, sticky: true)[
  #text(size: 12pt, weight: "bold", it.body)
  #v(-0.7em)
  #line(length: 100%, stroke: 0.5pt + rgb("#999999"))
]

#let role(left, right) = block(above: 0.75em, below: 0.35em, sticky: true, grid(
  columns: (1fr, auto),
  column-gutter: 1em,
  left,
  text(fill: rgb("#333333"), right),
))

$body$
