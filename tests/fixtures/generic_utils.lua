platform.apilevel = "2.0"

function addPair(left, right)
  return {
    ok = true,
    sum = left + right,
    values = {left, right}
  }
end

