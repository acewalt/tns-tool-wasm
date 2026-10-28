/* GPL-2.0-or-later: adapter for DaedalusX64's ROMFileUncompressed interface.
 * Original interface: StrmnNrmn, 2006. Cartridge data is selected locally. */
#include "Base/Types.h"
#include "RomFile/RomFileUncompressed.h"
#include "embedded_rom.h"
#include <cstring>
ROMFileUncompressed::ROMFileUncompressed(const std::filesystem::path filename):ROMFile(filename),mRomSize(TNS_ROM_SIZE){}
ROMFileUncompressed::~ROMFileUncompressed(){}
bool ROMFileUncompressed::Open(COutputStream&){
 u32 magic;
#ifdef TNS_EXTERNAL_ROM
 mFH.open(TNS_ROM_FILENAME,std::ios::in|std::ios::binary);if(!mFH)return false;mFH.read((char*)&magic,4);if(!mFH)return false;
#else
 memcpy(&magic,tns_rom_data,4);
#endif
 return SetHeaderMagic(magic);
}
bool ROMFileUncompressed::LoadRawData(u32 size,u8 *out,COutputStream&){
 return ReadChunk(0,out,size);
}
bool ROMFileUncompressed::ReadChunk(u32 offset,u8 *out,u32 size){
 if(!out||offset>mRomSize||size>mRomSize-offset)return false;
#ifdef TNS_EXTERNAL_ROM
 mFH.clear();mFH.seekg(offset);mFH.read((char*)out,size);if((u32)mFH.gcount()!=size)return false;
#else
 memcpy(out,((const unsigned char*)tns_rom_data)+offset,size);
#endif
 CorrectSwap(out,size);return true;
}
