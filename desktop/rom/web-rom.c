#include "embedded_rom.h"
#include <stdio.h>
#include <string.h>
unsigned tns_web_rom_size;
char tns_web_rom_filename[512], tns_web_save_filename[512];
int tns_web_init(int argc, char **argv, unsigned maximum) {
    if (argc < 1 || !argv || !argv[0] || strlen(argv[0]) > 450) return 1;
    strcpy(tns_web_rom_filename, argv[0]);
#ifdef TNS_WEB_FIXED_FILENAME
    char *slash = strrchr(tns_web_rom_filename, '/');
    strcpy(slash ? slash + 1 : tns_web_rom_filename, TNS_WEB_FIXED_FILENAME);
#else
    unsigned length = strlen(tns_web_rom_filename);
    if (length > 4 && !strcmp(tns_web_rom_filename + length - 4, ".tns")) tns_web_rom_filename[length - 4] = 0;
    strcat(tns_web_rom_filename, ".rom.tns");
#endif
    strcpy(tns_web_save_filename, tns_web_rom_filename);
    strcat(tns_web_save_filename, ".sav.tns");
    FILE *file = fopen(tns_web_rom_filename, "rb");
    if (!file) return 1;
    if (fseek(file, 0, SEEK_END)) { fclose(file); return 1; }
    long size = ftell(file); fclose(file);
    if (size < 16 || (unsigned long)size > maximum) return 1;
    tns_web_rom_size = (unsigned)size;
    return 0;
}
int tns_web_read(void *target, unsigned size) {
    if (size != tns_web_rom_size) return 1;
    FILE *file = fopen(tns_web_rom_filename, "rb");
    if (!file) return 1;
    unsigned read = fread(target, 1, size, file); fclose(file);
    return read != size;
}
