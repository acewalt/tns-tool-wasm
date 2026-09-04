# CAS Hybrid v2

Preview CAS order for TI-Nspire Lua `math.eval` / `math.evalStr`:

1. Giac/Xcas handles the normal symbolic request.
2. If `deSolve` returns an unresolved value such as `[]`, the hybrid layer tries a synchronous Giac-assisted first-order separable fallback.
3. If that does not apply, SymPy `dsolve` (loaded through the Pyodide already used by TNS Tool) is the secondary fallback.

The separable fallback factorizes the RHS, constructs candidate X/Y factors, verifies the product identity symbolically with Giac, then integrates both sides. It is generic for explicit first-order separable equations and is not hard-coded to the workshop equation.

TI `integral(...)` continues to be translated to Giac `integrate(...)` only inside Preview. The Lua stored in the TNS document is unchanged.
