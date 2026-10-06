BUILD := build
PARTS := info circle terrain sdf heightmap toy
TOOLCHAIN_BIN := $(abspath external/toolchains/mingw64/bin)

# Keep the compiler, make program, and runtime DLLs from the same MinGW release.
# This avoids accidentally loading the older CodeBlocks libstdc++ at runtime.
PATH := $(TOOLCHAIN_BIN);$(PATH)
export PATH

CMAKE_CONFIGURE := cmake -S . -B $(BUILD) -G "MinGW Makefiles" \
	-DCMAKE_BUILD_TYPE=Release \
	-DCMAKE_C_COMPILER="$(TOOLCHAIN_BIN)/gcc.exe" \
	-DCMAKE_CXX_COMPILER="$(TOOLCHAIN_BIN)/g++.exe" \
	-DCMAKE_MAKE_PROGRAM="$(TOOLCHAIN_BIN)/mingw32-make.exe"

.PHONY: all clean $(PARTS)

all:
	$(CMAKE_CONFIGURE)
	cmake --build $(BUILD)

$(PARTS):
	$(CMAKE_CONFIGURE)
	cmake --build $(BUILD) --target $@
	@echo "running ./$(BUILD)/$@"
	@./$(BUILD)/$@ $(ARGS)

clean:
	cmake -E remove_directory $(BUILD)
