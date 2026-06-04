import sys
import gc
import torch
from transformers import pipeline
from onecomp import Runner
from onecomp.model_config import ModelConfig
from onecomp.quantizer.gptq import GPTQ
from onecomp.calibration.calibration_config import CalibrationConfig
from onecomp.quantized_model_loader import QuantizedModelLoader

def cleanup():
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

def run_2bit_quantization():
    model_id = "SakanaAI/TinySwallow-1.5B-Instruct"
    save_dir = "./TinySwallow-1.5B-Instruct-2bit-GPTQ"
    
    print(f"Loading {model_id} for minimal memory 2-bit quantization...")
    
    # Use "auto" device map so HuggingFace can manage CPU/GPU offloading
    model_config = ModelConfig(
        model_id=model_id,
        device="auto", # Use auto to allow accelerate to offload to CPU RAM if needed
        dtype="float16"
    )
    
    # Force pure 2-bit GPTQ (No autobit mix)
    quantizer = GPTQ(wbits=2, groupsize=128)
    
    # Minimal Calibration Config for low memory
    calibration_config = CalibrationConfig(
        calibration_dataset="c4",
        num_calibration_samples=16, # reduced sample size to avoid OOM
        max_length=512,             # Shorter context length
        batch_size=1,               # Enables memory-efficient chunked quantization
        num_layers_per_group=1      # Process 1 layer at a time
    )
    
    runner = Runner(
        model_config=model_config,
        quantizer=quantizer,
        calibration_config=calibration_config,
        qep=False # Required to be False for batch_size chunking
    )
    
    cleanup()
    
    print("⏳ Starting chunked 2-bit quantization... This uses very little memory.")
    runner.run()
    
    print(f"✅ Quantization completed! Saving model to {save_dir}...")
    runner.save_quantized_model(save_dir)
    print("Done quantization phase!")
    return save_dir

def load_and_test(save_dir):
    print(f"Loading 2-bit quantized model from {save_dir}...")
    model, tokenizer = QuantizedModelLoader.load_quantized_model(
        save_dir,
        torch_dtype=torch.float16,
        device_map="auto"
    )
    
    print("Running inference test...")
    pipe = pipeline("text-generation", model=model, tokenizer=tokenizer)
    
    prompt = "日本の首都は"
    result = pipe(prompt, max_new_tokens=20, do_sample=True, temperature=0.7)
    
    print("Result:", result[0]["generated_text"])

    return model, tokenizer

if __name__ == "__main__":
    # 1. 2bit 量子化の実行
    save_dir = run_2bit_quantization()
    
    # 2. 量子化されたモデルの読み込みと推論
    cleanup()
    load_and_test(save_dir)
