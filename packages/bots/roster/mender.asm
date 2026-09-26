; Mender is a bomber that keeps a spare copy of its bomb loop and mends the live loop from it.
; Two processes share its turns: the bomber runs the live loop, 192 DAT words 6 bytes apart through
; di, bp, and si for one jump, and the mender compares the live loop with the spare word by word
; with repe cmpsw and copies back each word that differs, a full compare every 339 of its turns.
; A word that differs is a hit on one of the two copies: where the differing byte is zero in the
; spare, a bomb landed in the spare, and the mender mends the spare from the live loop instead.
; The bomber counts its passes in a heartbeat word: when a whole compare goes by with no new pass,
; the bomber is dead, and the mender starts a new one on the mended loop.
; The two copies of the loop are what make it a heavyweight: they are 1,356 of its 1,443 bytes,
; the live loop runs, and the mender reads the spare on every compare.
; vs imp.asm, seeds 1..20: 19 W / 0 T / 1 L
; vs dwarf.asm, seeds 1..20: 14 W / 0 T / 6 L

%name     "Mender"
%author   "ASM Bots"
%strategy "A bomber that mends its own loop from a spare copy"

STRIDE  equ     6                       ; bytes between bombs
REACH   equ     32 * STRIDE             ; a pointer bombs from REACH - STRIDE over it to REACH under it
PASS    equ     6 * REACH               ; bytes a pass covers: three pointers, 2 * REACH each
SIZE    equ     end - start
LAP     equ     (0x10000 - SIZE) / PASS ; passes in a lap: the last bomb lands past the body
WORDS   equ     (spare - live) / 2      ; words in a copy of the loop

; Setup: the base idiom puts our base address in bx; start the bomber, and dx is the last beat seen.
start:  call    .here
.here:  pop     bx
        sub     bx, .here
        lea     ax, [bx+live]
        spl     ax
        xor     dx, dx

; Mend: compare the two copies; at the end of a whole compare, check the heartbeat.
mend:   cld
        lea     si, [bx+spare]
        lea     di, [bx+live]
        mov     cx, WORDS

check:  repe    cmpsw                   ; stops one word past a word that differs
        jne     fix
        mov     ax, [bx+beat]
        cmp     ax, dx
        mov     dx, ax
        jne     mend                    ; a new pass since the last compare: the bomber lives
        lea     ax, [bx+live]
        spl     ax                      ; no new pass: start a new bomber
        jmp     mend

; Fix: find the byte that differs; zero in the spare means the spare is hit, else the live loop is.
fix:    sub     si, 2
        sub     di, 2
        mov     ax, [si]
        cmp     al, [di]
        je      .high
        test    al, al
        jz      .spare
        jmp     .live
.high:  test    ah, ah
        jz      .spare
.live:  mov     [di], ax                ; mend the live loop from the spare
        jmp     .on
.spare: mov     ax, [di]
        mov     [si], ax                ; mend the spare from the live loop
.on:    add     si, 2
        add     di, 2
        jcxz    mend
        jmp     check

; Data: the heartbeat, one more each pass of the bomber.
beat:   dw      0

; Live: the loop the bomber runs. Each lap starts under our base; di, bp, and si bomb a third each.
live:
lap:    lea     di, [bx-REACH]
        lea     bp, [di-2*REACH]
        lea     si, [bp-2*REACH]
        mov     cx, LAP
        xor     ax, ax                  ; ax = 0 is the bomb

; Pass: 192 bombs, then one step down, a heartbeat, and one jump.
pass:
        mov     [di+186], ax
        mov     [di+180], ax
        mov     [di+174], ax
        mov     [di+168], ax
        mov     [di+162], ax
        mov     [di+156], ax
        mov     [di+150], ax
        mov     [di+144], ax
        mov     [di+138], ax
        mov     [di+132], ax
        mov     [di+126], ax
        mov     [di+120], ax
        mov     [di+114], ax
        mov     [di+108], ax
        mov     [di+102], ax
        mov     [di+96], ax
        mov     [di+90], ax
        mov     [di+84], ax
        mov     [di+78], ax
        mov     [di+72], ax
        mov     [di+66], ax
        mov     [di+60], ax
        mov     [di+54], ax
        mov     [di+48], ax
        mov     [di+42], ax
        mov     [di+36], ax
        mov     [di+30], ax
        mov     [di+24], ax
        mov     [di+18], ax
        mov     [di+12], ax
        mov     [di+6], ax
        mov     [di+0], ax
        mov     [di-6], ax
        mov     [di-12], ax
        mov     [di-18], ax
        mov     [di-24], ax
        mov     [di-30], ax
        mov     [di-36], ax
        mov     [di-42], ax
        mov     [di-48], ax
        mov     [di-54], ax
        mov     [di-60], ax
        mov     [di-66], ax
        mov     [di-72], ax
        mov     [di-78], ax
        mov     [di-84], ax
        mov     [di-90], ax
        mov     [di-96], ax
        mov     [di-102], ax
        mov     [di-108], ax
        mov     [di-114], ax
        mov     [di-120], ax
        mov     [di-126], ax
        mov     [di-132], ax
        mov     [di-138], ax
        mov     [di-144], ax
        mov     [di-150], ax
        mov     [di-156], ax
        mov     [di-162], ax
        mov     [di-168], ax
        mov     [di-174], ax
        mov     [di-180], ax
        mov     [di-186], ax
        mov     [di-192], ax
        mov     [bp+186], ax
        mov     [bp+180], ax
        mov     [bp+174], ax
        mov     [bp+168], ax
        mov     [bp+162], ax
        mov     [bp+156], ax
        mov     [bp+150], ax
        mov     [bp+144], ax
        mov     [bp+138], ax
        mov     [bp+132], ax
        mov     [bp+126], ax
        mov     [bp+120], ax
        mov     [bp+114], ax
        mov     [bp+108], ax
        mov     [bp+102], ax
        mov     [bp+96], ax
        mov     [bp+90], ax
        mov     [bp+84], ax
        mov     [bp+78], ax
        mov     [bp+72], ax
        mov     [bp+66], ax
        mov     [bp+60], ax
        mov     [bp+54], ax
        mov     [bp+48], ax
        mov     [bp+42], ax
        mov     [bp+36], ax
        mov     [bp+30], ax
        mov     [bp+24], ax
        mov     [bp+18], ax
        mov     [bp+12], ax
        mov     [bp+6], ax
        mov     [bp+0], ax
        mov     [bp-6], ax
        mov     [bp-12], ax
        mov     [bp-18], ax
        mov     [bp-24], ax
        mov     [bp-30], ax
        mov     [bp-36], ax
        mov     [bp-42], ax
        mov     [bp-48], ax
        mov     [bp-54], ax
        mov     [bp-60], ax
        mov     [bp-66], ax
        mov     [bp-72], ax
        mov     [bp-78], ax
        mov     [bp-84], ax
        mov     [bp-90], ax
        mov     [bp-96], ax
        mov     [bp-102], ax
        mov     [bp-108], ax
        mov     [bp-114], ax
        mov     [bp-120], ax
        mov     [bp-126], ax
        mov     [bp-132], ax
        mov     [bp-138], ax
        mov     [bp-144], ax
        mov     [bp-150], ax
        mov     [bp-156], ax
        mov     [bp-162], ax
        mov     [bp-168], ax
        mov     [bp-174], ax
        mov     [bp-180], ax
        mov     [bp-186], ax
        mov     [bp-192], ax
        mov     [si+186], ax
        mov     [si+180], ax
        mov     [si+174], ax
        mov     [si+168], ax
        mov     [si+162], ax
        mov     [si+156], ax
        mov     [si+150], ax
        mov     [si+144], ax
        mov     [si+138], ax
        mov     [si+132], ax
        mov     [si+126], ax
        mov     [si+120], ax
        mov     [si+114], ax
        mov     [si+108], ax
        mov     [si+102], ax
        mov     [si+96], ax
        mov     [si+90], ax
        mov     [si+84], ax
        mov     [si+78], ax
        mov     [si+72], ax
        mov     [si+66], ax
        mov     [si+60], ax
        mov     [si+54], ax
        mov     [si+48], ax
        mov     [si+42], ax
        mov     [si+36], ax
        mov     [si+30], ax
        mov     [si+24], ax
        mov     [si+18], ax
        mov     [si+12], ax
        mov     [si+6], ax
        mov     [si+0], ax
        mov     [si-6], ax
        mov     [si-12], ax
        mov     [si-18], ax
        mov     [si-24], ax
        mov     [si-30], ax
        mov     [si-36], ax
        mov     [si-42], ax
        mov     [si-48], ax
        mov     [si-54], ax
        mov     [si-60], ax
        mov     [si-66], ax
        mov     [si-72], ax
        mov     [si-78], ax
        mov     [si-84], ax
        mov     [si-90], ax
        mov     [si-96], ax
        mov     [si-102], ax
        mov     [si-108], ax
        mov     [si-114], ax
        mov     [si-120], ax
        mov     [si-126], ax
        mov     [si-132], ax
        mov     [si-138], ax
        mov     [si-144], ax
        mov     [si-150], ax
        mov     [si-156], ax
        mov     [si-162], ax
        mov     [si-168], ax
        mov     [si-174], ax
        mov     [si-180], ax
        mov     [si-186], ax
        mov     [si-192], ax
        sub     di, PASS
        sub     bp, PASS
        sub     si, PASS
        inc     word [bx+beat]          ; one more pass: the bomber is alive
        loop    .next
        jmp     lap
.next:
        jmp     pass
        db      0x90                    ; makes the loop a whole number of words

; Spare: the same loop, byte for byte. It never runs: the mender reads it.
spare:
lap_p:  lea     di, [bx-REACH]
        lea     bp, [di-2*REACH]
        lea     si, [bp-2*REACH]
        mov     cx, LAP
        xor     ax, ax

pass_p:
        mov     [di+186], ax
        mov     [di+180], ax
        mov     [di+174], ax
        mov     [di+168], ax
        mov     [di+162], ax
        mov     [di+156], ax
        mov     [di+150], ax
        mov     [di+144], ax
        mov     [di+138], ax
        mov     [di+132], ax
        mov     [di+126], ax
        mov     [di+120], ax
        mov     [di+114], ax
        mov     [di+108], ax
        mov     [di+102], ax
        mov     [di+96], ax
        mov     [di+90], ax
        mov     [di+84], ax
        mov     [di+78], ax
        mov     [di+72], ax
        mov     [di+66], ax
        mov     [di+60], ax
        mov     [di+54], ax
        mov     [di+48], ax
        mov     [di+42], ax
        mov     [di+36], ax
        mov     [di+30], ax
        mov     [di+24], ax
        mov     [di+18], ax
        mov     [di+12], ax
        mov     [di+6], ax
        mov     [di+0], ax
        mov     [di-6], ax
        mov     [di-12], ax
        mov     [di-18], ax
        mov     [di-24], ax
        mov     [di-30], ax
        mov     [di-36], ax
        mov     [di-42], ax
        mov     [di-48], ax
        mov     [di-54], ax
        mov     [di-60], ax
        mov     [di-66], ax
        mov     [di-72], ax
        mov     [di-78], ax
        mov     [di-84], ax
        mov     [di-90], ax
        mov     [di-96], ax
        mov     [di-102], ax
        mov     [di-108], ax
        mov     [di-114], ax
        mov     [di-120], ax
        mov     [di-126], ax
        mov     [di-132], ax
        mov     [di-138], ax
        mov     [di-144], ax
        mov     [di-150], ax
        mov     [di-156], ax
        mov     [di-162], ax
        mov     [di-168], ax
        mov     [di-174], ax
        mov     [di-180], ax
        mov     [di-186], ax
        mov     [di-192], ax
        mov     [bp+186], ax
        mov     [bp+180], ax
        mov     [bp+174], ax
        mov     [bp+168], ax
        mov     [bp+162], ax
        mov     [bp+156], ax
        mov     [bp+150], ax
        mov     [bp+144], ax
        mov     [bp+138], ax
        mov     [bp+132], ax
        mov     [bp+126], ax
        mov     [bp+120], ax
        mov     [bp+114], ax
        mov     [bp+108], ax
        mov     [bp+102], ax
        mov     [bp+96], ax
        mov     [bp+90], ax
        mov     [bp+84], ax
        mov     [bp+78], ax
        mov     [bp+72], ax
        mov     [bp+66], ax
        mov     [bp+60], ax
        mov     [bp+54], ax
        mov     [bp+48], ax
        mov     [bp+42], ax
        mov     [bp+36], ax
        mov     [bp+30], ax
        mov     [bp+24], ax
        mov     [bp+18], ax
        mov     [bp+12], ax
        mov     [bp+6], ax
        mov     [bp+0], ax
        mov     [bp-6], ax
        mov     [bp-12], ax
        mov     [bp-18], ax
        mov     [bp-24], ax
        mov     [bp-30], ax
        mov     [bp-36], ax
        mov     [bp-42], ax
        mov     [bp-48], ax
        mov     [bp-54], ax
        mov     [bp-60], ax
        mov     [bp-66], ax
        mov     [bp-72], ax
        mov     [bp-78], ax
        mov     [bp-84], ax
        mov     [bp-90], ax
        mov     [bp-96], ax
        mov     [bp-102], ax
        mov     [bp-108], ax
        mov     [bp-114], ax
        mov     [bp-120], ax
        mov     [bp-126], ax
        mov     [bp-132], ax
        mov     [bp-138], ax
        mov     [bp-144], ax
        mov     [bp-150], ax
        mov     [bp-156], ax
        mov     [bp-162], ax
        mov     [bp-168], ax
        mov     [bp-174], ax
        mov     [bp-180], ax
        mov     [bp-186], ax
        mov     [bp-192], ax
        mov     [si+186], ax
        mov     [si+180], ax
        mov     [si+174], ax
        mov     [si+168], ax
        mov     [si+162], ax
        mov     [si+156], ax
        mov     [si+150], ax
        mov     [si+144], ax
        mov     [si+138], ax
        mov     [si+132], ax
        mov     [si+126], ax
        mov     [si+120], ax
        mov     [si+114], ax
        mov     [si+108], ax
        mov     [si+102], ax
        mov     [si+96], ax
        mov     [si+90], ax
        mov     [si+84], ax
        mov     [si+78], ax
        mov     [si+72], ax
        mov     [si+66], ax
        mov     [si+60], ax
        mov     [si+54], ax
        mov     [si+48], ax
        mov     [si+42], ax
        mov     [si+36], ax
        mov     [si+30], ax
        mov     [si+24], ax
        mov     [si+18], ax
        mov     [si+12], ax
        mov     [si+6], ax
        mov     [si+0], ax
        mov     [si-6], ax
        mov     [si-12], ax
        mov     [si-18], ax
        mov     [si-24], ax
        mov     [si-30], ax
        mov     [si-36], ax
        mov     [si-42], ax
        mov     [si-48], ax
        mov     [si-54], ax
        mov     [si-60], ax
        mov     [si-66], ax
        mov     [si-72], ax
        mov     [si-78], ax
        mov     [si-84], ax
        mov     [si-90], ax
        mov     [si-96], ax
        mov     [si-102], ax
        mov     [si-108], ax
        mov     [si-114], ax
        mov     [si-120], ax
        mov     [si-126], ax
        mov     [si-132], ax
        mov     [si-138], ax
        mov     [si-144], ax
        mov     [si-150], ax
        mov     [si-156], ax
        mov     [si-162], ax
        mov     [si-168], ax
        mov     [si-174], ax
        mov     [si-180], ax
        mov     [si-186], ax
        mov     [si-192], ax
        sub     di, PASS
        sub     bp, PASS
        sub     si, PASS
        inc     word [bx+beat]
        loop    .next_p
        jmp     lap_p
.next_p:
        jmp     pass_p
        db      0x90

end:
