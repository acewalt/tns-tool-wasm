.syntax unified
.arm
.global _start
_start: b start
.space 188
start:
    ldr r0,=0x04000000
    ldr r1,=0x0403
    strh r1,[r0]
    mov r6,#0
next:
    ldr r0,=0x04000006
wait1: ldrh r1,[r0]
    cmp r1,#160
    blt wait1
wait2: ldrh r1,[r0]
    cmp r1,#160
    bge wait2
    add r6,r6,#1
    ldr r0,=0x04000130
    ldrh r7,[r0]
    ldr r0,=0x0e000000
    strb r7,[r0]
    ldr r0,=0x06000000
    mov r1,#0
    ldr r3,=19200
fill:
    add r2,r1,r6,lsl #7
    tst r7,#1
    eoreq r2,r2,#0x7c00
    orr r2,r2,r2,lsl #16
    str r2,[r0],#4
    add r1,r1,#1
    subs r3,r3,#1
    bne fill
    b next
.ltorg
