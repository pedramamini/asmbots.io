; Swarm is 64 small bombers side by side, and it runs one process in each: the most a bot can have.
; The launcher gives each drone a lane of its own, a 64th of the core under the body, and starts it.
; A drone walks down its lane with 8 DAT words 8 bytes apart for each jump, and starts its lane
; again at the bottom, so all 64 lanes are bombed at the same time and the whole core in a lap.
; The drones share no code: a bomb or a carpet that lands on one drone kills that drone and its lane
; only, and a rival has to hit all 64 of them to win. That is what makes Swarm a super-heavy: the 64
; drones are 2,304 of its 2,334 bytes, and every one of them runs.
; vs imp.asm, seeds 1..20: 16 W / 4 T / 0 L
; vs dwarf.asm, seeds 1..20: 11 W / 0 T / 9 L

%name     "Swarm"
%author   "ASM Bots"
%strategy "64 bombers side by side, one process and one lane each"

STRIDE  equ     8                       ; bytes between bombs
STEP    equ     8 * STRIDE              ; bytes a drone walks down for each jump
DRONE   equ     d1 - d0                 ; bytes in a drone
SIZE    equ     end - start
LANE    equ     (0x10000 - SIZE) / 64 / STEP * STEP ; 64 lanes fill the core under the body
TURNS   equ     LANE / STEP             ; jumps in a lane

; Launch: bp is the top of a lane, si the drone that bombs it; start 63 drones and be the last.
start:  call    .here
.here:  pop     bx
        sub     bx, .here
        xor     ax, ax                  ; ax = 0 is the bomb
        mov     bp, bx                  ; the first lane ends under our base
        lea     si, [bx+d0]
        mov     cx, 63
.go:    spl     si
        sub     bp, LANE
        add     si, DRONE
        loop    .go
        jmp     si

; Drones: each starts at the top of its lane, di walks down, and cx counts the jumps to the bottom.
d0:     mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d0

d1:     mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d1

d2:     mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d2

d3:     mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d3

d4:     mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d4

d5:     mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d5

d6:     mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d6

d7:     mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d7

d8:     mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d8

d9:     mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d9

d10:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d10

d11:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d11

d12:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d12

d13:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d13

d14:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d14

d15:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d15

d16:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d16

d17:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d17

d18:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d18

d19:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d19

d20:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d20

d21:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d21

d22:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d22

d23:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d23

d24:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d24

d25:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d25

d26:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d26

d27:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d27

d28:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d28

d29:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d29

d30:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d30

d31:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d31

d32:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d32

d33:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d33

d34:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d34

d35:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d35

d36:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d36

d37:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d37

d38:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d38

d39:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d39

d40:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d40

d41:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d41

d42:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d42

d43:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d43

d44:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d44

d45:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d45

d46:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d46

d47:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d47

d48:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d48

d49:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d49

d50:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d50

d51:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d51

d52:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d52

d53:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d53

d54:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d54

d55:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d55

d56:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d56

d57:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d57

d58:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d58

d59:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d59

d60:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d60

d61:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d61

d62:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d62

d63:    mov     di, bp
        mov     cx, TURNS
.bomb:
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        sub     di, STEP
        loop    .bomb
        jmp     d63

end:
