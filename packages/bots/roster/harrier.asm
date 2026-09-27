; Harrier scans down the core 1,280 bytes at a time: 64 or's of words 20 bytes apart fold a block
; into ax, and a block that is not all zero gets a repe scasw to find its top word and a carpet of
; 32 DAT words from 20 bytes above that word.
; It counts its carpets in each lap of the core. Six carpets in one lap mean a crowded core (paper,
; a melee, or a long imp trail), where a carpet for each hit is too slow, and a lap with no carpet
; means that the rival hides between the samples.
; Either way it turns blind for eight laps of 64 DAT words a pass, 16 bytes apart, each lap 2 bytes
; lower than the last, and then it scans again.
; The two unrolled loops are what make it a middleweight: the or's and the bombs are 498 of its 603
; bytes. The scan runs in every fight, and the blind laps run when a lap is crowded or empty.
; vs imp.asm, seeds 1..20: 19 W / 1 T / 0 L
; vs dwarf.asm, seeds 1..20: 20 W / 0 T / 0 L

%name     "Harrier"
%author   "ASM Bots"
%strategy "Scan and carpet; bomb blind when a lap is crowded or empty"

K       equ     20                      ; bytes between sampled words
SAMPLES equ     64                      ; sampled words in a block
BLOCK   equ     SAMPLES * K             ; bytes in a block
TOP     equ     20                      ; the carpet starts this far above the hit
CWORDS  equ     32                      ; words in a carpet
BELOW   equ     TOP + 4                 ; a hit this close under the body is our own
ABOVE   equ     2 * CWORDS - TOP        ; and so is one this close over it
CROWD   equ     6                       ; carpets in a lap that make the core crowded
BLAPS   equ     8                       ; blind laps after a crowded or an empty lap
STRIDE  equ     16                      ; bytes between blind bombs
BOMBS   equ     64                      ; bombs in a pass
PASS    equ     BOMBS * STRIDE          ; bytes a pass covers
SIZE    equ     end - start
LAP     equ     (0x10000 - SIZE - STRIDE) / PASS ; passes in a bomb lap

; Setup: the base idiom puts our base address in bx; scans and carpets go down.
start:  call    .here
.here:  pop     bx
        sub     bx, .here
        std
        xor     dx, dx                  ; dx = the shift of the bomb laps

; Lap: scan down from under the body, bp counts the carpets.
lap:    lea     di, [bx-BELOW]
        xor     bp, bp

; Scan: or SAMPLES words K bytes apart into ax; all zero, and the block is empty.
scan:   xor     ax, ax
        or      ax, [di-1*K]
        or      ax, [di-2*K]
        or      ax, [di-3*K]
        or      ax, [di-4*K]
        or      ax, [di-5*K]
        or      ax, [di-6*K]
        or      ax, [di-7*K]
        or      ax, [di-8*K]
        or      ax, [di-9*K]
        or      ax, [di-10*K]
        or      ax, [di-11*K]
        or      ax, [di-12*K]
        or      ax, [di-13*K]
        or      ax, [di-14*K]
        or      ax, [di-15*K]
        or      ax, [di-16*K]
        or      ax, [di-17*K]
        or      ax, [di-18*K]
        or      ax, [di-19*K]
        or      ax, [di-20*K]
        or      ax, [di-21*K]
        or      ax, [di-22*K]
        or      ax, [di-23*K]
        or      ax, [di-24*K]
        or      ax, [di-25*K]
        or      ax, [di-26*K]
        or      ax, [di-27*K]
        or      ax, [di-28*K]
        or      ax, [di-29*K]
        or      ax, [di-30*K]
        or      ax, [di-31*K]
        or      ax, [di-32*K]
        or      ax, [di-33*K]
        or      ax, [di-34*K]
        or      ax, [di-35*K]
        or      ax, [di-36*K]
        or      ax, [di-37*K]
        or      ax, [di-38*K]
        or      ax, [di-39*K]
        or      ax, [di-40*K]
        or      ax, [di-41*K]
        or      ax, [di-42*K]
        or      ax, [di-43*K]
        or      ax, [di-44*K]
        or      ax, [di-45*K]
        or      ax, [di-46*K]
        or      ax, [di-47*K]
        or      ax, [di-48*K]
        or      ax, [di-49*K]
        or      ax, [di-50*K]
        or      ax, [di-51*K]
        or      ax, [di-52*K]
        or      ax, [di-53*K]
        or      ax, [di-54*K]
        or      ax, [di-55*K]
        or      ax, [di-56*K]
        or      ax, [di-57*K]
        or      ax, [di-58*K]
        or      ax, [di-59*K]
        or      ax, [di-60*K]
        or      ax, [di-61*K]
        or      ax, [di-62*K]
        or      ax, [di-63*K]
        or      ax, [di-64*K]
        jnz     look
        sub     di, BLOCK
        jmp     scan

; Look: find the top non-zero word of the block, and carpet it unless it is our own body.
look:   xor     ax, ax
        sub     di, K
        mov     cx, BLOCK / 2
        repe    scasw                   ; stops with di one word under the hit
        lea     si, [di+BELOW+2]
        sub     si, bx                  ; si = hit - (base - BELOW)
        cmp     si, BELOW + SIZE + ABOVE
        jb      home
        add     di, TOP + 2
        mov     cx, CWORDS
        rep     stosw
        inc     bp
        cmp     bp, CROWD
        jae     crowd
        jmp     scan

; Home: the scan is back at our body, and the lap is over. An empty lap turns blind too.
home:   test    bp, bp
        jz      crowd                   ; an empty lap: the rival hides between samples
        jmp     lap

; Crowd: CROWD carpets in one lap, or none: the next BLAPS laps are blind.
crowd:  mov     si, BLAPS

; Blind: each lap starts under our base, 2 bytes lower than the last.
blind:  mov     di, bx
        sub     di, dx
        add     dx, 2
        and     dx, STRIDE - 1
        mov     cx, LAP

; Pass: BOMBS bombs down from di, then one step down and one jump.
pass:
        mov     [di-1*STRIDE], ax
        mov     [di-2*STRIDE], ax
        mov     [di-3*STRIDE], ax
        mov     [di-4*STRIDE], ax
        mov     [di-5*STRIDE], ax
        mov     [di-6*STRIDE], ax
        mov     [di-7*STRIDE], ax
        mov     [di-8*STRIDE], ax
        mov     [di-9*STRIDE], ax
        mov     [di-10*STRIDE], ax
        mov     [di-11*STRIDE], ax
        mov     [di-12*STRIDE], ax
        mov     [di-13*STRIDE], ax
        mov     [di-14*STRIDE], ax
        mov     [di-15*STRIDE], ax
        mov     [di-16*STRIDE], ax
        mov     [di-17*STRIDE], ax
        mov     [di-18*STRIDE], ax
        mov     [di-19*STRIDE], ax
        mov     [di-20*STRIDE], ax
        mov     [di-21*STRIDE], ax
        mov     [di-22*STRIDE], ax
        mov     [di-23*STRIDE], ax
        mov     [di-24*STRIDE], ax
        mov     [di-25*STRIDE], ax
        mov     [di-26*STRIDE], ax
        mov     [di-27*STRIDE], ax
        mov     [di-28*STRIDE], ax
        mov     [di-29*STRIDE], ax
        mov     [di-30*STRIDE], ax
        mov     [di-31*STRIDE], ax
        mov     [di-32*STRIDE], ax
        mov     [di-33*STRIDE], ax
        mov     [di-34*STRIDE], ax
        mov     [di-35*STRIDE], ax
        mov     [di-36*STRIDE], ax
        mov     [di-37*STRIDE], ax
        mov     [di-38*STRIDE], ax
        mov     [di-39*STRIDE], ax
        mov     [di-40*STRIDE], ax
        mov     [di-41*STRIDE], ax
        mov     [di-42*STRIDE], ax
        mov     [di-43*STRIDE], ax
        mov     [di-44*STRIDE], ax
        mov     [di-45*STRIDE], ax
        mov     [di-46*STRIDE], ax
        mov     [di-47*STRIDE], ax
        mov     [di-48*STRIDE], ax
        mov     [di-49*STRIDE], ax
        mov     [di-50*STRIDE], ax
        mov     [di-51*STRIDE], ax
        mov     [di-52*STRIDE], ax
        mov     [di-53*STRIDE], ax
        mov     [di-54*STRIDE], ax
        mov     [di-55*STRIDE], ax
        mov     [di-56*STRIDE], ax
        mov     [di-57*STRIDE], ax
        mov     [di-58*STRIDE], ax
        mov     [di-59*STRIDE], ax
        mov     [di-60*STRIDE], ax
        mov     [di-61*STRIDE], ax
        mov     [di-62*STRIDE], ax
        mov     [di-63*STRIDE], ax
        mov     [di-64*STRIDE], ax
        sub     di, PASS
        loop    .next
        dec     si
        jz      .scan
        jmp     blind
.scan:  jmp     lap
.next:  jmp     pass

end:
