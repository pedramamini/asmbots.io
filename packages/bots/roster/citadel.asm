; Citadel is three copies of a bomber, its cells, and each one watches the next and rebuilds it.
; Each cell runs a process of its own and bombs a third of the core: a pass drops 152 DAT words
; 8 bytes apart through di and bp for one jump, and adds one to the cell's beat.
; At the end of each pass a cell reads the next cell's beat. When it has not moved for 4 passes,
; the next cell is dead: the cell copies itself over it with rep movsw, which also wipes out the
; bombs that killed it, and starts a new process there. Cell 0 watches cell 1, 1 watches 2, and 2
; watches 0, so while one cell lives, the citadel rebuilds the other two.
; A child process starts with its parent's registers, so the parent puts the new cell's base in bx
; before it splits: three processes that each ran the call-and-pop idiom at once would share one
; stack word and could pop each other's address.
; The three cells are what make Citadel a super-heavy: they are 2,118 of its 2,138 bytes, and all
; three run.
; vs imp.asm, seeds 1..20: 13 W / 7 T / 0 L
; vs dwarf.asm, seeds 1..20: 13 W / 0 T / 7 L

%name     "Citadel"
%author   "ASM Bots"
%strategy "Three bombers that rebuild each other"

STRIDE  equ     8                       ; bytes between bombs
REACH   equ     38 * STRIDE             ; a pointer bombs from REACH - STRIDE over it to REACH under it
PASS    equ     4 * REACH               ; bytes a pass covers: two pointers, 2 * REACH each
LIMIT   equ     4                       ; passes with no new beat before a cell counts as dead
CELL    equ     c1 - c0                 ; bytes in a cell
SIZE    equ     end - start
HEAD    equ     c0 - start              ; bytes before cell 0: the lanes start under them
THIRD   equ     (0x10000 - SIZE) / 3 / PASS * PASS ; the three lanes fill the core under the body
PASSES  equ     THIRD / PASS            ; passes in a lap
BEAT    equ     c0.beat - c0            ; where a cell's data is, from its base
SAVED   equ     c0.saved - c0
STALE   equ     c0.stal - c0
IDX     equ     c0.idxb - c0
LANES   equ     c0.lanes - c0
NEXTS   equ     c0.nexts - c0

; Setup: the base idiom puts cell 1's base in bx; start cells 1 and 2, and run cell 0.
start:  call    .here
.here:  pop     bx
        add     bx, c1 - .here
        spl     bx
        add     bx, CELL
        spl     bx
        sub     bx, 2 * CELL

; Cell 0: the same bytes as the other two cells but for its index.
c0:     xor     ax, ax                  ; ax = 0 is the bomb
        xor     dx, dx                  ; dx = the next cell's beat as last seen

; Lap: di and bp bomb this cell's third of the core, and si points at the next cell.
.lap:   mov     al, [bx+IDX]
        add     ax, ax
        mov     si, ax
        mov     di, [bx+si+LANES]
        add     di, bx
        lea     bp, [di-2*REACH]
        mov     si, [bx+si+NEXTS]
        add     si, bx
        mov     cx, PASSES
        xor     ax, ax

; Pass: 152 bombs, one step down, a beat, and a look at the next cell's beat.
.pass:
        mov     [di+296], ax
        mov     [di+288], ax
        mov     [di+280], ax
        mov     [di+272], ax
        mov     [di+264], ax
        mov     [di+256], ax
        mov     [di+248], ax
        mov     [di+240], ax
        mov     [di+232], ax
        mov     [di+224], ax
        mov     [di+216], ax
        mov     [di+208], ax
        mov     [di+200], ax
        mov     [di+192], ax
        mov     [di+184], ax
        mov     [di+176], ax
        mov     [di+168], ax
        mov     [di+160], ax
        mov     [di+152], ax
        mov     [di+144], ax
        mov     [di+136], ax
        mov     [di+128], ax
        mov     [di+120], ax
        mov     [di+112], ax
        mov     [di+104], ax
        mov     [di+96], ax
        mov     [di+88], ax
        mov     [di+80], ax
        mov     [di+72], ax
        mov     [di+64], ax
        mov     [di+56], ax
        mov     [di+48], ax
        mov     [di+40], ax
        mov     [di+32], ax
        mov     [di+24], ax
        mov     [di+16], ax
        mov     [di+8], ax
        mov     [di+0], ax
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        mov     [di-72], ax
        mov     [di-80], ax
        mov     [di-88], ax
        mov     [di-96], ax
        mov     [di-104], ax
        mov     [di-112], ax
        mov     [di-120], ax
        mov     [di-128], ax
        mov     [di-136], ax
        mov     [di-144], ax
        mov     [di-152], ax
        mov     [di-160], ax
        mov     [di-168], ax
        mov     [di-176], ax
        mov     [di-184], ax
        mov     [di-192], ax
        mov     [di-200], ax
        mov     [di-208], ax
        mov     [di-216], ax
        mov     [di-224], ax
        mov     [di-232], ax
        mov     [di-240], ax
        mov     [di-248], ax
        mov     [di-256], ax
        mov     [di-264], ax
        mov     [di-272], ax
        mov     [di-280], ax
        mov     [di-288], ax
        mov     [di-296], ax
        mov     [di-304], ax
        mov     [bp+296], ax
        mov     [bp+288], ax
        mov     [bp+280], ax
        mov     [bp+272], ax
        mov     [bp+264], ax
        mov     [bp+256], ax
        mov     [bp+248], ax
        mov     [bp+240], ax
        mov     [bp+232], ax
        mov     [bp+224], ax
        mov     [bp+216], ax
        mov     [bp+208], ax
        mov     [bp+200], ax
        mov     [bp+192], ax
        mov     [bp+184], ax
        mov     [bp+176], ax
        mov     [bp+168], ax
        mov     [bp+160], ax
        mov     [bp+152], ax
        mov     [bp+144], ax
        mov     [bp+136], ax
        mov     [bp+128], ax
        mov     [bp+120], ax
        mov     [bp+112], ax
        mov     [bp+104], ax
        mov     [bp+96], ax
        mov     [bp+88], ax
        mov     [bp+80], ax
        mov     [bp+72], ax
        mov     [bp+64], ax
        mov     [bp+56], ax
        mov     [bp+48], ax
        mov     [bp+40], ax
        mov     [bp+32], ax
        mov     [bp+24], ax
        mov     [bp+16], ax
        mov     [bp+8], ax
        mov     [bp+0], ax
        mov     [bp-8], ax
        mov     [bp-16], ax
        mov     [bp-24], ax
        mov     [bp-32], ax
        mov     [bp-40], ax
        mov     [bp-48], ax
        mov     [bp-56], ax
        mov     [bp-64], ax
        mov     [bp-72], ax
        mov     [bp-80], ax
        mov     [bp-88], ax
        mov     [bp-96], ax
        mov     [bp-104], ax
        mov     [bp-112], ax
        mov     [bp-120], ax
        mov     [bp-128], ax
        mov     [bp-136], ax
        mov     [bp-144], ax
        mov     [bp-152], ax
        mov     [bp-160], ax
        mov     [bp-168], ax
        mov     [bp-176], ax
        mov     [bp-184], ax
        mov     [bp-192], ax
        mov     [bp-200], ax
        mov     [bp-208], ax
        mov     [bp-216], ax
        mov     [bp-224], ax
        mov     [bp-232], ax
        mov     [bp-240], ax
        mov     [bp-248], ax
        mov     [bp-256], ax
        mov     [bp-264], ax
        mov     [bp-272], ax
        mov     [bp-280], ax
        mov     [bp-288], ax
        mov     [bp-296], ax
        mov     [bp-304], ax
        sub     di, PASS
        sub     bp, PASS
        inc     word [bx+BEAT]
        cmp     [si+BEAT], dx
        je      .stale
        mov     dx, [si+BEAT]
        mov     byte [bx+STALE], 0
.on:    loop    .next
        jmp     .lap
.next:  jmp     .pass

; Stale: the next cell's beat has not moved. After LIMIT passes it is dead: copy this cell over it,
; give the copy its index, and start it.
.stale: inc     byte [bx+STALE]
        cmp     byte [bx+STALE], LIMIT
        jb      .on
        mov     [bx+SAVED], di
        mov     [bx+SAVED+2], cx
        mov     di, si
        mov     si, bx
        mov     cx, CELL / 2
        cld
        rep     movsw
        lea     si, [di-CELL]           ; the new cell
        mov     al, [bx+IDX]
        inc     ax
        cmp     al, 3
        jb      .idx
        xor     ax, ax
.idx:   mov     [si+IDX], al
        xor     ax, ax
        mov     [si+STALE], al
        mov     [bx+STALE], al
        xchg    bx, si                  ; a child starts with the parent's registers: bx = the new cell
        spl     bx
        xchg    bx, si
        mov     di, [bx+SAVED]
        mov     cx, [bx+SAVED+2]
        jmp     .on

; Data: the beat, one more each pass; a place to keep di and cx; the stale count, a word to keep
; the cell an even length; the index; and, by index, where the lane starts and the next cell is.
.beat:  dw      0
.saved: dw      0, 0
.stal:  dw      0
.idxb:  db      0
.lanes: dw      -HEAD - REACH, -HEAD - REACH - THIRD - CELL, -HEAD - REACH - 2 * THIRD - 2 * CELL
.nexts: dw      CELL, CELL, -2 * CELL

; Cell 1: the same bytes as the other two cells but for its index.
c1:     xor     ax, ax                  ; ax = 0 is the bomb
        xor     dx, dx                  ; dx = the next cell's beat as last seen

; Lap: di and bp bomb this cell's third of the core, and si points at the next cell.
.lap:   mov     al, [bx+IDX]
        add     ax, ax
        mov     si, ax
        mov     di, [bx+si+LANES]
        add     di, bx
        lea     bp, [di-2*REACH]
        mov     si, [bx+si+NEXTS]
        add     si, bx
        mov     cx, PASSES
        xor     ax, ax

; Pass: 152 bombs, one step down, a beat, and a look at the next cell's beat.
.pass:
        mov     [di+296], ax
        mov     [di+288], ax
        mov     [di+280], ax
        mov     [di+272], ax
        mov     [di+264], ax
        mov     [di+256], ax
        mov     [di+248], ax
        mov     [di+240], ax
        mov     [di+232], ax
        mov     [di+224], ax
        mov     [di+216], ax
        mov     [di+208], ax
        mov     [di+200], ax
        mov     [di+192], ax
        mov     [di+184], ax
        mov     [di+176], ax
        mov     [di+168], ax
        mov     [di+160], ax
        mov     [di+152], ax
        mov     [di+144], ax
        mov     [di+136], ax
        mov     [di+128], ax
        mov     [di+120], ax
        mov     [di+112], ax
        mov     [di+104], ax
        mov     [di+96], ax
        mov     [di+88], ax
        mov     [di+80], ax
        mov     [di+72], ax
        mov     [di+64], ax
        mov     [di+56], ax
        mov     [di+48], ax
        mov     [di+40], ax
        mov     [di+32], ax
        mov     [di+24], ax
        mov     [di+16], ax
        mov     [di+8], ax
        mov     [di+0], ax
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        mov     [di-72], ax
        mov     [di-80], ax
        mov     [di-88], ax
        mov     [di-96], ax
        mov     [di-104], ax
        mov     [di-112], ax
        mov     [di-120], ax
        mov     [di-128], ax
        mov     [di-136], ax
        mov     [di-144], ax
        mov     [di-152], ax
        mov     [di-160], ax
        mov     [di-168], ax
        mov     [di-176], ax
        mov     [di-184], ax
        mov     [di-192], ax
        mov     [di-200], ax
        mov     [di-208], ax
        mov     [di-216], ax
        mov     [di-224], ax
        mov     [di-232], ax
        mov     [di-240], ax
        mov     [di-248], ax
        mov     [di-256], ax
        mov     [di-264], ax
        mov     [di-272], ax
        mov     [di-280], ax
        mov     [di-288], ax
        mov     [di-296], ax
        mov     [di-304], ax
        mov     [bp+296], ax
        mov     [bp+288], ax
        mov     [bp+280], ax
        mov     [bp+272], ax
        mov     [bp+264], ax
        mov     [bp+256], ax
        mov     [bp+248], ax
        mov     [bp+240], ax
        mov     [bp+232], ax
        mov     [bp+224], ax
        mov     [bp+216], ax
        mov     [bp+208], ax
        mov     [bp+200], ax
        mov     [bp+192], ax
        mov     [bp+184], ax
        mov     [bp+176], ax
        mov     [bp+168], ax
        mov     [bp+160], ax
        mov     [bp+152], ax
        mov     [bp+144], ax
        mov     [bp+136], ax
        mov     [bp+128], ax
        mov     [bp+120], ax
        mov     [bp+112], ax
        mov     [bp+104], ax
        mov     [bp+96], ax
        mov     [bp+88], ax
        mov     [bp+80], ax
        mov     [bp+72], ax
        mov     [bp+64], ax
        mov     [bp+56], ax
        mov     [bp+48], ax
        mov     [bp+40], ax
        mov     [bp+32], ax
        mov     [bp+24], ax
        mov     [bp+16], ax
        mov     [bp+8], ax
        mov     [bp+0], ax
        mov     [bp-8], ax
        mov     [bp-16], ax
        mov     [bp-24], ax
        mov     [bp-32], ax
        mov     [bp-40], ax
        mov     [bp-48], ax
        mov     [bp-56], ax
        mov     [bp-64], ax
        mov     [bp-72], ax
        mov     [bp-80], ax
        mov     [bp-88], ax
        mov     [bp-96], ax
        mov     [bp-104], ax
        mov     [bp-112], ax
        mov     [bp-120], ax
        mov     [bp-128], ax
        mov     [bp-136], ax
        mov     [bp-144], ax
        mov     [bp-152], ax
        mov     [bp-160], ax
        mov     [bp-168], ax
        mov     [bp-176], ax
        mov     [bp-184], ax
        mov     [bp-192], ax
        mov     [bp-200], ax
        mov     [bp-208], ax
        mov     [bp-216], ax
        mov     [bp-224], ax
        mov     [bp-232], ax
        mov     [bp-240], ax
        mov     [bp-248], ax
        mov     [bp-256], ax
        mov     [bp-264], ax
        mov     [bp-272], ax
        mov     [bp-280], ax
        mov     [bp-288], ax
        mov     [bp-296], ax
        mov     [bp-304], ax
        sub     di, PASS
        sub     bp, PASS
        inc     word [bx+BEAT]
        cmp     [si+BEAT], dx
        je      .stale
        mov     dx, [si+BEAT]
        mov     byte [bx+STALE], 0
.on:    loop    .next
        jmp     .lap
.next:  jmp     .pass

; Stale: the next cell's beat has not moved. After LIMIT passes it is dead: copy this cell over it,
; give the copy its index, and start it.
.stale: inc     byte [bx+STALE]
        cmp     byte [bx+STALE], LIMIT
        jb      .on
        mov     [bx+SAVED], di
        mov     [bx+SAVED+2], cx
        mov     di, si
        mov     si, bx
        mov     cx, CELL / 2
        cld
        rep     movsw
        lea     si, [di-CELL]           ; the new cell
        mov     al, [bx+IDX]
        inc     ax
        cmp     al, 3
        jb      .idx
        xor     ax, ax
.idx:   mov     [si+IDX], al
        xor     ax, ax
        mov     [si+STALE], al
        mov     [bx+STALE], al
        xchg    bx, si                  ; a child starts with the parent's registers: bx = the new cell
        spl     bx
        xchg    bx, si
        mov     di, [bx+SAVED]
        mov     cx, [bx+SAVED+2]
        jmp     .on

; Data: the beat, one more each pass; a place to keep di and cx; the stale count, a word to keep
; the cell an even length; the index; and, by index, where the lane starts and the next cell is.
.beat:  dw      0
.saved: dw      0, 0
.stal:  dw      0
.idxb:  db      1
.lanes: dw      -HEAD - REACH, -HEAD - REACH - THIRD - CELL, -HEAD - REACH - 2 * THIRD - 2 * CELL
.nexts: dw      CELL, CELL, -2 * CELL

; Cell 2: the same bytes as the other two cells but for its index.
c2:     xor     ax, ax                  ; ax = 0 is the bomb
        xor     dx, dx                  ; dx = the next cell's beat as last seen

; Lap: di and bp bomb this cell's third of the core, and si points at the next cell.
.lap:   mov     al, [bx+IDX]
        add     ax, ax
        mov     si, ax
        mov     di, [bx+si+LANES]
        add     di, bx
        lea     bp, [di-2*REACH]
        mov     si, [bx+si+NEXTS]
        add     si, bx
        mov     cx, PASSES
        xor     ax, ax

; Pass: 152 bombs, one step down, a beat, and a look at the next cell's beat.
.pass:
        mov     [di+296], ax
        mov     [di+288], ax
        mov     [di+280], ax
        mov     [di+272], ax
        mov     [di+264], ax
        mov     [di+256], ax
        mov     [di+248], ax
        mov     [di+240], ax
        mov     [di+232], ax
        mov     [di+224], ax
        mov     [di+216], ax
        mov     [di+208], ax
        mov     [di+200], ax
        mov     [di+192], ax
        mov     [di+184], ax
        mov     [di+176], ax
        mov     [di+168], ax
        mov     [di+160], ax
        mov     [di+152], ax
        mov     [di+144], ax
        mov     [di+136], ax
        mov     [di+128], ax
        mov     [di+120], ax
        mov     [di+112], ax
        mov     [di+104], ax
        mov     [di+96], ax
        mov     [di+88], ax
        mov     [di+80], ax
        mov     [di+72], ax
        mov     [di+64], ax
        mov     [di+56], ax
        mov     [di+48], ax
        mov     [di+40], ax
        mov     [di+32], ax
        mov     [di+24], ax
        mov     [di+16], ax
        mov     [di+8], ax
        mov     [di+0], ax
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        mov     [di-72], ax
        mov     [di-80], ax
        mov     [di-88], ax
        mov     [di-96], ax
        mov     [di-104], ax
        mov     [di-112], ax
        mov     [di-120], ax
        mov     [di-128], ax
        mov     [di-136], ax
        mov     [di-144], ax
        mov     [di-152], ax
        mov     [di-160], ax
        mov     [di-168], ax
        mov     [di-176], ax
        mov     [di-184], ax
        mov     [di-192], ax
        mov     [di-200], ax
        mov     [di-208], ax
        mov     [di-216], ax
        mov     [di-224], ax
        mov     [di-232], ax
        mov     [di-240], ax
        mov     [di-248], ax
        mov     [di-256], ax
        mov     [di-264], ax
        mov     [di-272], ax
        mov     [di-280], ax
        mov     [di-288], ax
        mov     [di-296], ax
        mov     [di-304], ax
        mov     [bp+296], ax
        mov     [bp+288], ax
        mov     [bp+280], ax
        mov     [bp+272], ax
        mov     [bp+264], ax
        mov     [bp+256], ax
        mov     [bp+248], ax
        mov     [bp+240], ax
        mov     [bp+232], ax
        mov     [bp+224], ax
        mov     [bp+216], ax
        mov     [bp+208], ax
        mov     [bp+200], ax
        mov     [bp+192], ax
        mov     [bp+184], ax
        mov     [bp+176], ax
        mov     [bp+168], ax
        mov     [bp+160], ax
        mov     [bp+152], ax
        mov     [bp+144], ax
        mov     [bp+136], ax
        mov     [bp+128], ax
        mov     [bp+120], ax
        mov     [bp+112], ax
        mov     [bp+104], ax
        mov     [bp+96], ax
        mov     [bp+88], ax
        mov     [bp+80], ax
        mov     [bp+72], ax
        mov     [bp+64], ax
        mov     [bp+56], ax
        mov     [bp+48], ax
        mov     [bp+40], ax
        mov     [bp+32], ax
        mov     [bp+24], ax
        mov     [bp+16], ax
        mov     [bp+8], ax
        mov     [bp+0], ax
        mov     [bp-8], ax
        mov     [bp-16], ax
        mov     [bp-24], ax
        mov     [bp-32], ax
        mov     [bp-40], ax
        mov     [bp-48], ax
        mov     [bp-56], ax
        mov     [bp-64], ax
        mov     [bp-72], ax
        mov     [bp-80], ax
        mov     [bp-88], ax
        mov     [bp-96], ax
        mov     [bp-104], ax
        mov     [bp-112], ax
        mov     [bp-120], ax
        mov     [bp-128], ax
        mov     [bp-136], ax
        mov     [bp-144], ax
        mov     [bp-152], ax
        mov     [bp-160], ax
        mov     [bp-168], ax
        mov     [bp-176], ax
        mov     [bp-184], ax
        mov     [bp-192], ax
        mov     [bp-200], ax
        mov     [bp-208], ax
        mov     [bp-216], ax
        mov     [bp-224], ax
        mov     [bp-232], ax
        mov     [bp-240], ax
        mov     [bp-248], ax
        mov     [bp-256], ax
        mov     [bp-264], ax
        mov     [bp-272], ax
        mov     [bp-280], ax
        mov     [bp-288], ax
        mov     [bp-296], ax
        mov     [bp-304], ax
        sub     di, PASS
        sub     bp, PASS
        inc     word [bx+BEAT]
        cmp     [si+BEAT], dx
        je      .stale
        mov     dx, [si+BEAT]
        mov     byte [bx+STALE], 0
.on:    loop    .next
        jmp     .lap
.next:  jmp     .pass

; Stale: the next cell's beat has not moved. After LIMIT passes it is dead: copy this cell over it,
; give the copy its index, and start it.
.stale: inc     byte [bx+STALE]
        cmp     byte [bx+STALE], LIMIT
        jb      .on
        mov     [bx+SAVED], di
        mov     [bx+SAVED+2], cx
        mov     di, si
        mov     si, bx
        mov     cx, CELL / 2
        cld
        rep     movsw
        lea     si, [di-CELL]           ; the new cell
        mov     al, [bx+IDX]
        inc     ax
        cmp     al, 3
        jb      .idx
        xor     ax, ax
.idx:   mov     [si+IDX], al
        xor     ax, ax
        mov     [si+STALE], al
        mov     [bx+STALE], al
        xchg    bx, si                  ; a child starts with the parent's registers: bx = the new cell
        spl     bx
        xchg    bx, si
        mov     di, [bx+SAVED]
        mov     cx, [bx+SAVED+2]
        jmp     .on

; Data: the beat, one more each pass; a place to keep di and cx; the stale count, a word to keep
; the cell an even length; the index; and, by index, where the lane starts and the next cell is.
.beat:  dw      0
.saved: dw      0, 0
.stal:  dw      0
.idxb:  db      2
.lanes: dw      -HEAD - REACH, -HEAD - REACH - THIRD - CELL, -HEAD - REACH - 2 * THIRD - 2 * CELL
.nexts: dw      CELL, CELL, -2 * CELL

end:
