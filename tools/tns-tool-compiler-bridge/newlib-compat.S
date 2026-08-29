/* Compatibility hooks for modern GNU Arm Newlib.
 *
 * Ndless r2022 runs its own constructor/destructor lists through
 * __cpp_init/__cpp_fini. Newer Newlib still references the traditional
 * _init/_fini hooks from libc init/fini support. Keep these weak and empty
 * so a project can override them without changing Ndless startup behavior.
 */

.syntax unified
.arm

.section .text.tns_newlib_compat,"ax",%progbits
.align 2

.weak _init
.type _init, %function
_init:
    bx lr
.size _init, .-_init

.weak _fini
.type _fini, %function
_fini:
    bx lr
.size _fini, .-_fini

.section .note.GNU-stack,"",%progbits
