#pragma once
#ifdef __cplusplus
extern "C" {
#endif
extern unsigned tns_web_rom_size;
extern char tns_web_rom_filename[512], tns_web_save_filename[512];
int tns_web_init(int argc, char **argv, unsigned maximum);
int tns_web_read(void *target, unsigned size);
#ifdef __cplusplus
}
#endif
#define TNS_ROM_SIZE tns_web_rom_size
#define TNS_ROM_FILENAME tns_web_rom_filename
#define TNS_SAVE_FILENAME tns_web_save_filename
#define TNS_EXTERNAL_ROM 1
