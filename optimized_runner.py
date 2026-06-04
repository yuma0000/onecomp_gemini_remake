"""
OneCompression - Colab & Kaggle Friendly Optimized Runner
Copyright 2024 - Repaired Version

This script bypasses the default `Runner.auto_run()` which causes 
Out-Of-Memory (OOM) errors on 15GB/16GB VRAM GPUs (T4/P100).
It implements a memory-efficient calibration and device mapping scheme.
"""

import math
from onecomp import Runner
from onecomp.model_config import ModelConfig
from onecomp.quantizer.gptq import GPTQ
from onecomp.quantizer.autobit import AutoBitQuantizer
from onecomp.calibration.calibration_config import CalibrationConfig
import torch
import gc

def cleanup_memory():
    """Clear unused memory from CPU and GPU."""
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

def run_onecomp_colab(
    model_id: str, 
    target_wbits: float = 4.0, 
    save_dir: str = "quantized_model",
    samples: int = 32, 
    length: int = 512
):
    """
    Colab / Kaggle optimized OneCompression execution flow.
    Instantiates Runner manually to inject memory constraints.
    """
    print(f"🚀 Loading {model_id} for Colab (Memory Optimized OOM Fix)...")
    
    # 1. Device Mapping Fix
    # Use "auto" instead of "cuda:0" so HuggingFace accelerate can 
    # offload layers to CPU RAM if the uncompressed 16-bit model exceeds VRAM.
    model_config = ModelConfig(
        model_id=model_id, 
        device="auto", 
        dtype="float16" # Force 16-bit to save space
    )
    
    # 2. Quantizer Configuration
    candidate_bits = (2, 3, 4, 8)
    groupsize = 128
    
    candidate_quantizers = [
        GPTQ(wbits=b, groupsize=groupsize) for b in candidate_bits
    ]
    
    quantizer = AutoBitQuantizer(
        assignment_strategy="activation_aware",
        quantizers=candidate_quantizers,
        target_bit=target_wbits,
        save_path=save_dir,
        enable_fused_groups=True,
    )
    
    # 3. THE FIX: Memory-Optimized Calibration Profile
    # Default is samples=512, length=2048 (Creates a 1M+ token batch -> Guaranteed OOM)
    # We reduce it severely: 32 samples of 512 length = ~16,000 tokens. 
    # This prevents the initial `model(**inputs)` forward pass from crashing.
    calibration_config = CalibrationConfig(
        num_calibration_samples=samples, 
        max_length=length,
        calibration_dataset="c4",
    )
    
    print(f"⚙️ Overriding Calibration: {samples} samples, {length} seq length.")
    
    # 4. Instantiate Runner explicitly
    runner = Runner(
        model_config=model_config,
        quantizer=quantizer,
        calibration_config=calibration_config,
        qep=True, # Keep Quantization Error Propagation for high quality
        evaluate=False # Disable post-quantization perplexity checks to save VRAM
    )
    
    cleanup_memory()
    
    # 5. Execute Quantization
    print("⏳ Starting Quantization process... This may take a while.")
    runner.run()
    
    # 6. Save State
    if save_dir:
        runner.save_quantized_model(save_dir)
        print(f"✅ Fast Colab Quantization Completed! Model saved to `{save_dir}`")

if __name__ == "__main__":
    # Example for LLaMA 2 7B format. 
    # Must run `huggingface-cli login` in Colab beforehand if it's gated.
    run_onecomp_colab(
        model_id="TinyLlama/TinyLlama-1.1B-intermediate-step-1431k-3T", 
        target_wbits=4.0, 
        save_dir="./tiny_quantized",
        # For a 7B model, use: samples=16, length=512 for absolute safety
    )
