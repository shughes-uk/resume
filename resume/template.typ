#set document(title: "Samantha Hughes Resume", author: "Samantha Hughes", date: none)

#let ink = rgb("#1b1b1f")
#let muted = rgb("#5c6370")
#let rule = rgb("#c4c8cf")
#let accent = rgb("#1f4f8f")
#let semibold = "IBM Plex Sans SmBld"

#set page(paper: "us-letter", margin: (x: 0.6in, top: 0.5in, bottom: 0.45in))
#set text(font: "IBM Plex Sans Text", size: 9.75pt, fill: ink, hyphenate: false, costs: (runt: 400%))
#set par(leading: 0.56em, spacing: 0.66em, linebreaks: "optimized")
#set list(
  indent: 0pt,
  body-indent: 0.55em,
  spacing: 0.58em,
  marker: text(fill: muted, baseline: -0.05em)[•],
)
#show strong: set text(font: semibold, weight: 600)
#show link: set text(fill: accent)
#show regex("[A-Z][A-Za-z]*/[A-Za-z]+"): box
#show "->": set text(tracking: -0.06em)

#show heading.where(level: 1): it => block(below: 0.5em,
  text(font: "IBM Plex Sans", size: 22pt, weight: "bold", tracking: -0.01em, it.body))

#show heading.where(level: 2): it => block(above: 1.15em, below: 0.6em, sticky: true, {
  set text(font: semibold, weight: 600, size: 9.75pt, fill: accent, tracking: 0.09em)
  grid(
    columns: (auto, 1fr),
    column-gutter: 0.6em,
    align: horizon,
    upper(it.body),
    line(length: 100%, stroke: 0.5pt + rule),
  )
})

#let role(left, right) = block(above: 0.9em, below: 0.45em, sticky: true, {
  show "-": set text(fill: muted)
  grid(
    columns: (1fr, auto),
    column-gutter: 1em,
    left,
    text(fill: muted, number-width: "tabular", right),
  )
})

#let sep = [#h(0.5em)#text(fill: muted)[·]#h(0.5em)]

#let splits(n, lines) = if lines == 1 { ((),) } else {
  range(1, n)
    .map(k => splits(n - k, lines - 1).map(rest => (k,) + rest.map(r => r + k)))
    .fold((), (acc, x) => acc + x)
}

#let groups(items, cuts) = {
  let bounds = (0,) + cuts + (items.len(),)
  range(cuts.len() + 1).map(i => items.slice(bounds.at(i), bounds.at(i + 1)))
}

#let contact(items) = layout(size => context {
  let line-width(g) = measure(g.join(sep)).width
  let fits(gs) = gs.all(g => g.len() == 1 or line-width(g) <= size.width)
  let cost(gs) = gs.map(g => calc.pow((size.width - line-width(g)) / size.width, 2)).sum()
  let best = range(1, items.len() + 1)
    .map(lines => splits(items.len(), lines).map(cuts => groups(items, cuts)).filter(fits))
    .find(options => options.len() > 0)
    .sorted(key: cost)
    .first()
  align(center, best.map(g => g.join(sep)).join(linebreak()))
})

#show: doc => {
  let kids = doc.children
  let first-section = kids.position(c => c.func() == heading and c.depth == 2)
  if first-section == none { return doc }
  let head = kids.slice(0, first-section)
  let items = head.filter(c => c.func() == box).map(b => {
    show regex("(Phone|Email|LinkedIn|GitHub):"): set text(fill: muted)
    b
  })
  let title = head.filter(c => c.func() == heading)
  align(center, title.join())
  if items.len() > 0 {
    contact(items)
  } else {
    align(center, head.filter(c => c.func() != heading).join())
  }
  kids.slice(first-section).join()
}

$body$
