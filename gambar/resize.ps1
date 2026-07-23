Add-Type -AssemblyName System.Drawing

$sourcePath = 'C:\JOB ONLINE\box-inc\gambar\box inc.png'
$outDir = 'C:\JOB ONLINE\box-inc\gambar'

$img = [System.Drawing.Image]::FromFile($sourcePath)
$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 2, 27, 54))

# 1. Square (800x800)
$bmpSquare = New-Object System.Drawing.Bitmap(800, 800)
$g = [System.Drawing.Graphics]::FromImage($bmpSquare)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, 0, 0, 800, 800)
$g.Dispose()
$bmpSquare.Save("$outDir\cover_square_800x800.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmpSquare.Dispose()

# 2. Landscape (1920x1080)
$bmpLand = New-Object System.Drawing.Bitmap(1920, 1080)
$g = [System.Drawing.Graphics]::FromImage($bmpLand)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.FillRectangle($bgBrush, 0, 0, 1920, 1080)
$x = (1920 - 1080) / 2
$g.DrawImage($img, $x, 0, 1080, 1080)
$g.Dispose()
$bmpLand.Save("$outDir\cover_landscape_1920x1080.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmpLand.Dispose()

# 3. Portrait (800x1200)
$bmpPort = New-Object System.Drawing.Bitmap(800, 1200)
$g = [System.Drawing.Graphics]::FromImage($bmpPort)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.FillRectangle($bgBrush, 0, 0, 800, 1200)
$y = (1200 - 800) / 2
$g.DrawImage($img, 0, $y, 800, 800)
$g.Dispose()
$bmpPort.Save("$outDir\cover_portrait_800x1200.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmpPort.Dispose()

$img.Dispose()
$bgBrush.Dispose()

Write-Host "Berhasil membuat 3 ukuran gambar!"
