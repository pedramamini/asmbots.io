; Garrison runs two processes: a bomber, and a keeper that holds an imp gate and mends the bomber.
; The bomber walks up the core from over our end, 96 DAT words 8 bytes apart for each jump, so it
; meets a bomber that walks down toward us before that bomber's bombs get here.
; The keeper decrements the gate word 16 bytes under the base 20 times for each word it checks, so
; an imp that walks up into us runs a broken word at the gate and dies there.
; It keeps two spare copies of the bomb loop, and for each word the spares vote: when they agree,
; their word goes into the live loop, and when they differ, the copy that agrees with the live word
; mends the other. After each round of the loop, a heartbeat that has not moved means the bomber is
; dead, and the keeper starts a new one on the mended loop.
; The three copies of the loop are what make it a heavyweight: they are 990 of its 1,140 bytes, the
; live loop runs, and the keeper reads both spares on each round.
; vs imp.asm, seeds 1..20: 20 W / 0 T / 0 L
; vs dwarf.asm, seeds 1..20: 18 W / 0 T / 2 L

%name     "Garrison"
%author   "ASM Bots"
%strategy "An imp gate that mends its bomber by a vote of three copies"

GATE    equ     16                      ; the gate word is this far under the base
STRIDE  equ     8                       ; bytes between bombs
REACH   equ     32 * STRIDE             ; bytes a pointer covers in a pass
PASS    equ     3 * REACH               ; bytes a pass covers: di, si, and bx
SIZE    equ     end - start
LAP     equ     (0x10000 - SIZE - STRIDE) / PASS ; passes in a lap: the last bomb lands under the base
WORDS   equ     (spare1 - live) / 2     ; words in a copy of the loop

; Setup: the base idiom puts our base address in bp, as bx is a bomb pointer. Start the bomber;
; dx is the last heartbeat seen.
start:  call    .here
.here:  pop     bp
        sub     bp, .here
        lea     ax, [bp+live]
        spl     ax
        xor     dx, dx

; Keep: for each word of the loop, the two spares vote. When they agree, their word goes into the
; live loop; then 20 turns on the gate. After the last word, a heartbeat that did not move
; means the bomber is dead, and a new one starts on the mended loop.
keep:   xor     si, si
.word:  mov     ax, [bp+si+spare1]
        cmp     ax, [bp+si+spare2]
        jne     .split
        mov     [bp+si+live], ax        ; the spares agree: mend the live word
.on:
        dec     word [bp-GATE]
        dec     word [bp-GATE]
        dec     word [bp-GATE]
        dec     word [bp-GATE]
        dec     word [bp-GATE]
        dec     word [bp-GATE]
        dec     word [bp-GATE]
        dec     word [bp-GATE]
        dec     word [bp-GATE]
        dec     word [bp-GATE]
        dec     word [bp-GATE]
        dec     word [bp-GATE]
        dec     word [bp-GATE]
        dec     word [bp-GATE]
        dec     word [bp-GATE]
        dec     word [bp-GATE]
        dec     word [bp-GATE]
        dec     word [bp-GATE]
        dec     word [bp-GATE]
        dec     word [bp-GATE]
        add     si, 2
        cmp     si, 2 * WORDS
        jb      .word
        mov     ax, [bp+beat]
        cmp     ax, dx
        mov     dx, ax
        jne     keep                    ; a new pass since the last round: the bomber lives
        lea     ax, [bp+live]
        spl     ax
        jmp     keep

; Split: the spares differ, so a bomb hit one of them. The one that agrees with the live word is
; right, and mends the other; if neither does, spare 2 mends spare 1 and the live loop.
.split: mov     ax, [bp+si+live]
        cmp     ax, [bp+si+spare1]
        jne     .s1
        mov     [bp+si+spare2], ax
        jmp     .on
.s1:    mov     ax, [bp+si+spare2]
        mov     [bp+si+spare1], ax
        mov     [bp+si+live], ax
        jmp     .on

; Data: the heartbeat, one more each pass of the bomber.
beat:   dw      0

; Live: the loop the bomber runs. Each lap starts over our end and walks up the core, so it
; meets a bomber that walks down toward us before that bomber gets here. A pass drops 96 bombs
; through di, si, and bx, then steps up, beats, and jumps.
live:   xor     ax, ax
        lea     di, [bp+SIZE+124]
        lea     si, [di+REACH]
        lea     bx, [si+REACH]
        mov     cx, LAP
.pass:
        mov     [di-124], ax
        mov     [di-116], ax
        mov     [di-108], ax
        mov     [di-100], ax
        mov     [di-92], ax
        mov     [di-84], ax
        mov     [di-76], ax
        mov     [di-68], ax
        mov     [di-60], ax
        mov     [di-52], ax
        mov     [di-44], ax
        mov     [di-36], ax
        mov     [di-28], ax
        mov     [di-20], ax
        mov     [di-12], ax
        mov     [di-4], ax
        mov     [di+4], ax
        mov     [di+12], ax
        mov     [di+20], ax
        mov     [di+28], ax
        mov     [di+36], ax
        mov     [di+44], ax
        mov     [di+52], ax
        mov     [di+60], ax
        mov     [di+68], ax
        mov     [di+76], ax
        mov     [di+84], ax
        mov     [di+92], ax
        mov     [di+100], ax
        mov     [di+108], ax
        mov     [di+116], ax
        mov     [di+124], ax
        mov     [si-124], ax
        mov     [si-116], ax
        mov     [si-108], ax
        mov     [si-100], ax
        mov     [si-92], ax
        mov     [si-84], ax
        mov     [si-76], ax
        mov     [si-68], ax
        mov     [si-60], ax
        mov     [si-52], ax
        mov     [si-44], ax
        mov     [si-36], ax
        mov     [si-28], ax
        mov     [si-20], ax
        mov     [si-12], ax
        mov     [si-4], ax
        mov     [si+4], ax
        mov     [si+12], ax
        mov     [si+20], ax
        mov     [si+28], ax
        mov     [si+36], ax
        mov     [si+44], ax
        mov     [si+52], ax
        mov     [si+60], ax
        mov     [si+68], ax
        mov     [si+76], ax
        mov     [si+84], ax
        mov     [si+92], ax
        mov     [si+100], ax
        mov     [si+108], ax
        mov     [si+116], ax
        mov     [si+124], ax
        mov     [bx-124], ax
        mov     [bx-116], ax
        mov     [bx-108], ax
        mov     [bx-100], ax
        mov     [bx-92], ax
        mov     [bx-84], ax
        mov     [bx-76], ax
        mov     [bx-68], ax
        mov     [bx-60], ax
        mov     [bx-52], ax
        mov     [bx-44], ax
        mov     [bx-36], ax
        mov     [bx-28], ax
        mov     [bx-20], ax
        mov     [bx-12], ax
        mov     [bx-4], ax
        mov     [bx+4], ax
        mov     [bx+12], ax
        mov     [bx+20], ax
        mov     [bx+28], ax
        mov     [bx+36], ax
        mov     [bx+44], ax
        mov     [bx+52], ax
        mov     [bx+60], ax
        mov     [bx+68], ax
        mov     [bx+76], ax
        mov     [bx+84], ax
        mov     [bx+92], ax
        mov     [bx+100], ax
        mov     [bx+108], ax
        mov     [bx+116], ax
        mov     [bx+124], ax
        add     di, PASS
        add     si, PASS
        add     bx, PASS
        inc     word [bp+beat]          ; one more pass: the bomber is alive
        loop    .next
        jmp     live
.next:  jmp     .pass
        db      0x90                    ; makes the loop a whole number of words

; Spare1: the same loop, byte for byte. It never runs: the keeper reads it.
spare1:
spare1_l: xor   ax, ax
        lea     di, [bp+SIZE+124]
        lea     si, [di+REACH]
        lea     bx, [si+REACH]
        mov     cx, LAP
.pass:
        mov     [di-124], ax
        mov     [di-116], ax
        mov     [di-108], ax
        mov     [di-100], ax
        mov     [di-92], ax
        mov     [di-84], ax
        mov     [di-76], ax
        mov     [di-68], ax
        mov     [di-60], ax
        mov     [di-52], ax
        mov     [di-44], ax
        mov     [di-36], ax
        mov     [di-28], ax
        mov     [di-20], ax
        mov     [di-12], ax
        mov     [di-4], ax
        mov     [di+4], ax
        mov     [di+12], ax
        mov     [di+20], ax
        mov     [di+28], ax
        mov     [di+36], ax
        mov     [di+44], ax
        mov     [di+52], ax
        mov     [di+60], ax
        mov     [di+68], ax
        mov     [di+76], ax
        mov     [di+84], ax
        mov     [di+92], ax
        mov     [di+100], ax
        mov     [di+108], ax
        mov     [di+116], ax
        mov     [di+124], ax
        mov     [si-124], ax
        mov     [si-116], ax
        mov     [si-108], ax
        mov     [si-100], ax
        mov     [si-92], ax
        mov     [si-84], ax
        mov     [si-76], ax
        mov     [si-68], ax
        mov     [si-60], ax
        mov     [si-52], ax
        mov     [si-44], ax
        mov     [si-36], ax
        mov     [si-28], ax
        mov     [si-20], ax
        mov     [si-12], ax
        mov     [si-4], ax
        mov     [si+4], ax
        mov     [si+12], ax
        mov     [si+20], ax
        mov     [si+28], ax
        mov     [si+36], ax
        mov     [si+44], ax
        mov     [si+52], ax
        mov     [si+60], ax
        mov     [si+68], ax
        mov     [si+76], ax
        mov     [si+84], ax
        mov     [si+92], ax
        mov     [si+100], ax
        mov     [si+108], ax
        mov     [si+116], ax
        mov     [si+124], ax
        mov     [bx-124], ax
        mov     [bx-116], ax
        mov     [bx-108], ax
        mov     [bx-100], ax
        mov     [bx-92], ax
        mov     [bx-84], ax
        mov     [bx-76], ax
        mov     [bx-68], ax
        mov     [bx-60], ax
        mov     [bx-52], ax
        mov     [bx-44], ax
        mov     [bx-36], ax
        mov     [bx-28], ax
        mov     [bx-20], ax
        mov     [bx-12], ax
        mov     [bx-4], ax
        mov     [bx+4], ax
        mov     [bx+12], ax
        mov     [bx+20], ax
        mov     [bx+28], ax
        mov     [bx+36], ax
        mov     [bx+44], ax
        mov     [bx+52], ax
        mov     [bx+60], ax
        mov     [bx+68], ax
        mov     [bx+76], ax
        mov     [bx+84], ax
        mov     [bx+92], ax
        mov     [bx+100], ax
        mov     [bx+108], ax
        mov     [bx+116], ax
        mov     [bx+124], ax
        add     di, PASS
        add     si, PASS
        add     bx, PASS
        inc     word [bp+beat]          ; one more pass: the bomber is alive
        loop    .next
        jmp     spare1_l
.next:  jmp     .pass
        db      0x90                    ; makes the loop a whole number of words

; Spare2: the same loop, byte for byte. It never runs: the keeper reads it.
spare2:
spare2_l: xor   ax, ax
        lea     di, [bp+SIZE+124]
        lea     si, [di+REACH]
        lea     bx, [si+REACH]
        mov     cx, LAP
.pass:
        mov     [di-124], ax
        mov     [di-116], ax
        mov     [di-108], ax
        mov     [di-100], ax
        mov     [di-92], ax
        mov     [di-84], ax
        mov     [di-76], ax
        mov     [di-68], ax
        mov     [di-60], ax
        mov     [di-52], ax
        mov     [di-44], ax
        mov     [di-36], ax
        mov     [di-28], ax
        mov     [di-20], ax
        mov     [di-12], ax
        mov     [di-4], ax
        mov     [di+4], ax
        mov     [di+12], ax
        mov     [di+20], ax
        mov     [di+28], ax
        mov     [di+36], ax
        mov     [di+44], ax
        mov     [di+52], ax
        mov     [di+60], ax
        mov     [di+68], ax
        mov     [di+76], ax
        mov     [di+84], ax
        mov     [di+92], ax
        mov     [di+100], ax
        mov     [di+108], ax
        mov     [di+116], ax
        mov     [di+124], ax
        mov     [si-124], ax
        mov     [si-116], ax
        mov     [si-108], ax
        mov     [si-100], ax
        mov     [si-92], ax
        mov     [si-84], ax
        mov     [si-76], ax
        mov     [si-68], ax
        mov     [si-60], ax
        mov     [si-52], ax
        mov     [si-44], ax
        mov     [si-36], ax
        mov     [si-28], ax
        mov     [si-20], ax
        mov     [si-12], ax
        mov     [si-4], ax
        mov     [si+4], ax
        mov     [si+12], ax
        mov     [si+20], ax
        mov     [si+28], ax
        mov     [si+36], ax
        mov     [si+44], ax
        mov     [si+52], ax
        mov     [si+60], ax
        mov     [si+68], ax
        mov     [si+76], ax
        mov     [si+84], ax
        mov     [si+92], ax
        mov     [si+100], ax
        mov     [si+108], ax
        mov     [si+116], ax
        mov     [si+124], ax
        mov     [bx-124], ax
        mov     [bx-116], ax
        mov     [bx-108], ax
        mov     [bx-100], ax
        mov     [bx-92], ax
        mov     [bx-84], ax
        mov     [bx-76], ax
        mov     [bx-68], ax
        mov     [bx-60], ax
        mov     [bx-52], ax
        mov     [bx-44], ax
        mov     [bx-36], ax
        mov     [bx-28], ax
        mov     [bx-20], ax
        mov     [bx-12], ax
        mov     [bx-4], ax
        mov     [bx+4], ax
        mov     [bx+12], ax
        mov     [bx+20], ax
        mov     [bx+28], ax
        mov     [bx+36], ax
        mov     [bx+44], ax
        mov     [bx+52], ax
        mov     [bx+60], ax
        mov     [bx+68], ax
        mov     [bx+76], ax
        mov     [bx+84], ax
        mov     [bx+92], ax
        mov     [bx+100], ax
        mov     [bx+108], ax
        mov     [bx+116], ax
        mov     [bx+124], ax
        add     di, PASS
        add     si, PASS
        add     bx, PASS
        inc     word [bp+beat]          ; one more pass: the bomber is alive
        loop    .next
        jmp     spare2_l
.next:  jmp     .pass
        db      0x90                    ; makes the loop a whole number of words

end:
