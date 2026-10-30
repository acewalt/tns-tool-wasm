/* Ndless frontend for binjgb. Cartridge bytes are generated locally. */
#include <libndls.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#undef SCREEN_WIDTH
#undef SCREEN_HEIGHT
#define FALSE BINJGB_FALSE
#define TRUE BINJGB_TRUE
#include "emulator.h"
#undef FALSE
#undef TRUE
#include "embedded_rom.h"

static unsigned short pixels[320 * 240];
static void paint(Emulator *e) {
    const RGBA *frame = *emulator_get_frame_buffer(e);
    for (unsigned y = 0; y < 240; y++) {
        unsigned sy = y * 144 / 240;
        for (unsigned x = 0; x < 266; x++) {
            unsigned c = frame[sy * 160 + x * 160 / 266];
            pixels[y * 320 + 27 + x] = ((c & 0xf8) << 8) | ((c >> 5) & 0x7e0) | ((c >> 19) & 31);
        }
    }
    lcd_blit(pixels, SCR_320x240_565);
}
int main(void) {
    EmulatorInit init = {0};
    init.rom.size = TNS_ROM_SIZE;
    init.rom.data = malloc(TNS_ROM_SIZE);
    if (!init.rom.data) return 1;
    memcpy(init.rom.data, tns_rom_data, TNS_ROM_SIZE);
    init.audio_frequency = 8000;
    init.audio_frames = 256;
    init.random_seed = 0xcabba6e5;
    init.cgb_color_curve = CGB_COLOR_CURVE_NONE;
    Emulator *e = emulator_new(&init);
    if (!e) { puts("GB/GBC initialization failed"); return 2; }
    FILE *save = fopen(TNS_SAVE_FILENAME, "rb");
    if (save) { fclose(save); emulator_read_ext_ram_from_file(e, TNS_SAVE_FILENAME); }
    if (!lcd_init(SCR_320x240_565)) { emulator_delete(e); return 3; }
    puts("GB/GBC core running");
    unsigned frames = 0;
    while (!isKeyPressed(KEY_NSPIRE_ESC)) {
        JoypadButtons joy = {0};
        joy.up=isKeyPressed(KEY_NSPIRE_UP); joy.down=isKeyPressed(KEY_NSPIRE_DOWN);
        joy.left=isKeyPressed(KEY_NSPIRE_LEFT); joy.right=isKeyPressed(KEY_NSPIRE_RIGHT);
        joy.start=isKeyPressed(KEY_NSPIRE_ENTER); joy.select=isKeyPressed(KEY_NSPIRE_TAB);
        joy.A=isKeyPressed(KEY_NSPIRE_CTRL); joy.B=isKeyPressed(KEY_NSPIRE_SHIFT);
        emulator_set_joypad_buttons(e, &joy);
        Ticks target = emulator_get_ticks(e) + PPU_FRAME_TICKS;
        for (;;) {
            EmulatorEvent event = emulator_run_until(e, target);
            if (event & EMULATOR_EVENT_INVALID_OPCODE) { puts("Invalid GB/GBC opcode"); emulator_delete(e); return 4; }
            if (event & EMULATOR_EVENT_NEW_FRAME) { paint(e); frames++; }
            if (event & EMULATOR_EVENT_UNTIL_TICKS) break;
        }
        if (frames && frames % 300 == 0 && emulator_was_ext_ram_updated(e)) emulator_write_ext_ram_to_file(e, TNS_SAVE_FILENAME);
    }
    emulator_write_ext_ram_to_file(e, TNS_SAVE_FILENAME);
    emulator_delete(e);
    puts("GB/GBC saved and exited");
    return 0;
}
