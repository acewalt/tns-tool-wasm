platform.apilevel = "2.0"

counter = 0
textValue = ""

function on.paint(gc)
  gc:setFont("sansserif", "b", 12)
  gc:setColorRGB(0, 0, 0)
  gc:drawString("Counter: " .. counter, 10, 20, "top")
  gc:drawString("Text: " .. textValue, 10, 40, "top")
end

function on.charIn(ch)
  textValue = textValue .. ch
end

function on.enterKey()
  counter = counter + 1
end

function on.backspaceKey()
  textValue = string.sub(textValue, 1, -2)
end

function on.escapeKey()
  textValue = ""
end

function on.arrowKey(direction)
  textValue = textValue .. "[" .. direction .. "]"
end

function on.mouseDown(x, y)
  textValue = "mouse:" .. x .. "," .. y
end
