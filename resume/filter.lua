local is_typst = FORMAT:match("typst") ~= nil

local function to_typst(inlines)
  return pandoc.write(pandoc.Pandoc({ pandoc.Plain(inlines) }), "typst"):gsub("%s+$", "")
end

local function slice(list, first, last)
  local out = pandoc.Inlines({})
  for i = first, last do
    out:insert(list[i])
  end
  return out
end

local function split_role(inlines)
  for i = 2, #inlines - 1 do
    local el = inlines[i]
    if el.t == "Str" and el.text == "-" and inlines[i - 1].t == "Space" and inlines[i + 1].t == "Space" then
      return slice(inlines, 1, i - 2), slice(inlines, i + 2, #inlines)
    end
  end
  return inlines, pandoc.Inlines({})
end

local function contact_line(items)
  local out = pandoc.Inlines({})
  for i, item in ipairs(items) do
    if i > 1 then
      out:extend({ pandoc.Space(), pandoc.Str("·"), pandoc.Space() })
    end
    local inlines = pandoc.utils.blocks_to_inlines(item)
    if is_typst then
      out:insert(pandoc.RawInline("typst", "#box["))
      out:extend(inlines)
      out:insert(pandoc.RawInline("typst", "]"))
    else
      out:extend(inlines)
    end
  end
  return pandoc.Para(out)
end

local function role(header, dates)
  local company, title = split_role(header.content)
  local left = pandoc.Inlines({ pandoc.Strong(company) })
  if #title > 0 then
    left:extend({ pandoc.Space(), pandoc.Str("-"), pandoc.Space(), pandoc.Emph(title) })
  end
  if is_typst then
    return { pandoc.RawBlock("typst", "#role[" .. to_typst(left) .. "][" .. to_typst(dates) .. "]") }
  end
  return {
    pandoc.Header(3, left, header.attr),
    pandoc.Div({ pandoc.Para(dates) }, { ["custom-style"] = "Dates" }),
  }
end

-- Typst reads "->" in markup as an arrow glyph; ATS parsers need the ASCII form.
local literal_arrows = {
  Str = function(el)
    if not is_typst or not el.text:find("->", 1, true) then
      return nil
    end
    local out = pandoc.Inlines({})
    local pos = 1
    while true do
      local s, e = el.text:find("->", pos, true)
      if not s then
        break
      end
      if s > pos then
        out:insert(pandoc.Str(el.text:sub(pos, s - 1)))
      end
      out:insert(pandoc.RawInline("typst", '#"->"'))
      pos = e + 1
    end
    if pos <= #el.text then
      out:insert(pandoc.Str(el.text:sub(pos)))
    end
    return out
  end,
}

local layout = {
  Pandoc = function(doc)
    local blocks = pandoc.Blocks({})
    local seen_section = false
    local i = 1
    while i <= #doc.blocks do
      local b = doc.blocks[i]
      local nxt = doc.blocks[i + 1]
      if b.t == "Header" and b.level == 2 then
        seen_section = true
        blocks:insert(b)
      elseif b.t == "BulletList" and not seen_section then
        blocks:insert(contact_line(b.content))
      elseif b.t == "Header" and b.level == 3 and nxt and nxt.t == "Para" then
        blocks:extend(role(b, nxt.content))
        i = i + 1
      else
        blocks:insert(b)
      end
      i = i + 1
    end
    doc.blocks = blocks
    return doc
  end,
}

return { literal_arrows, layout }
