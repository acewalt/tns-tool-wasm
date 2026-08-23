platform.apilevel = "2.0"

function solveAnyEquation(raw)
  if raw == "y''+4*y=0" then
    return {
      valid = true,
      solved = true,
      verified = false,
      result = "y=C1*cos(2*x)+C2*sin(2*x)",
      lines = {
        "Ecuacion caracteristica:",
        "r^2+4=0"
      }
    }
  end

  if raw == "y''+4*y=0;y=cos(2*x)" then
    return {
      valid = true,
      solved = false,
      verified = true,
      result = "La candidata satisface la EDO."
    }
  end

  return {
    valid = false,
    solved = false,
    verified = false,
    error = "No reconocido"
  }
end

function nested()
  return {
    ok = true,
    data = {
      items = {1, 2, 3}
    }
  }
end

function countWithNext()
  local total = 0
  do
    local values = { a = 1, b = 2, c = 3 }
    for _key, value in next, values, nil do
      total = total + value
    end
  end
  return total
end
