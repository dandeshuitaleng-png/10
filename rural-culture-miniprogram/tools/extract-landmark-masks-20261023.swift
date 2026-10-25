import Foundation
import Darwin
import Vision
import CoreImage
import ImageIO
import UniformTypeIdentifiers
guard CommandLine.arguments.count == 3 else {
 fputs("Usage: extract-landmark-masks source-directory output-directory\n", stderr)
 exit(64)
}
let source=URL(fileURLWithPath:CommandLine.arguments[1])
let destination=URL(fileURLWithPath:CommandLine.arguments[2])
guard source.standardizedFileURL != destination.standardizedFileURL else {
 fputs("Source and output directories must differ\n", stderr)
 exit(64)
}
var failures = 0
try FileManager.default.createDirectory(at:destination,withIntermediateDirectories:true)
let context=CIContext(options:[.useSoftwareRenderer:false])
for file in try FileManager.default.contentsOfDirectory(at:source,includingPropertiesForKeys:nil).filter({$0.pathExtension=="png"}).sorted(by:{$0.lastPathComponent<$1.lastPathComponent}) {
 do {
  guard let input=CGImageSourceCreateWithURL(file as CFURL,nil),let cg=CGImageSourceCreateImageAtIndex(input,0,nil)else{throw NSError(domain:"image",code:1)}
  let request=VNGenerateForegroundInstanceMaskRequest()
  let handler=VNImageRequestHandler(cgImage:cg,options:[:])
  try handler.perform([request])
  guard let result=request.results?.first,!result.allInstances.isEmpty else {failures += 1; print("no subject: \(file.lastPathComponent)");continue}
  let mask=try result.generateScaledMaskForImage(forInstances:result.allInstances,from:handler)
  let image=CIImage(cvPixelBuffer:mask)
  guard let output=context.createCGImage(image,from:image.extent),let writer=CGImageDestinationCreateWithURL(destination.appendingPathComponent(file.lastPathComponent)as CFURL,UTType.png.identifier as CFString,1,nil)else{throw NSError(domain:"mask",code:2)}
  CGImageDestinationAddImage(writer,output,nil)
  guard CGImageDestinationFinalize(writer)else{throw NSError(domain:"mask",code:3)}
  print("\(file.lastPathComponent): \(result.allInstances.count) instance(s), \(cg.width)x\(cg.height)")
 }catch{failures += 1; print("\(file.lastPathComponent): \(error)")}
}

if failures > 0 { exit(1) }
