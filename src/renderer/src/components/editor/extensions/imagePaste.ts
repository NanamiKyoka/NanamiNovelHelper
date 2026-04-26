import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export interface ImagePasteOptions {
  maxSize: number
  allowedFormats: string[]
  onUpload: (file: File) => Promise<string | null>
}

const DEFAULT_OPTIONS: ImagePasteOptions = {
  maxSize: 10 * 1024 * 1024,
  allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  onUpload: async () => null
}

export const ImagePaste = Extension.create<ImagePasteOptions>({
  name: 'imagePaste',

  addOptions() {
    return DEFAULT_OPTIONS
  },

  addProseMirrorPlugins() {
    const options = this.options

    return [
      new Plugin({
        key: new PluginKey('imagePaste'),
        props: {
          handlePaste: (view, event) => {
            const items = event.clipboardData?.items
            if (!items) return false

            const imageItems: DataTransferItem[] = []
            for (let i = 0; i < items.length; i++) {
              const item = items[i]
              if (item.type.startsWith('image/')) {
                imageItems.push(item)
              }
            }

            if (imageItems.length === 0) return false

            event.preventDefault()

            for (const item of imageItems) {
              const file = item.getAsFile()
              if (!file) continue

              const ext = file.type.split('/')[1]?.toLowerCase() || ''
              const fileName = file.name || `image.${ext}`
              const fileExt = fileName.split('.').pop()?.toLowerCase() || ext
              if (!options.allowedFormats.includes(fileExt) && !options.allowedFormats.includes(ext)) {
                console.warn(`Image format ${fileExt} not allowed`)
                continue
              }

              if (file.size > options.maxSize) {
                console.warn(`Image size ${file.size} exceeds max ${options.maxSize}`)
                continue
              }

              options.onUpload(file).then((result) => {
                if (result) {
                  view.dispatch(
                    view.state.tr.replaceSelectionWith(
                      view.state.schema.nodes.image.create({
                        src: result
                      })
                    )
                  )
                }
              })
            }

            return true
          },
          handleDrop: (view, event) => {
            if (!event.dataTransfer) return false

            const files = event.dataTransfer.files
            if (!files || files.length === 0) return false

            const imageFiles: File[] = []
            for (let i = 0; i < files.length; i++) {
              const file = files[i]
              if (file.type.startsWith('image/')) {
                imageFiles.push(file)
              }
            }

            if (imageFiles.length === 0) return false

            event.preventDefault()

            for (const file of imageFiles) {
              const ext = file.name.split('.').pop()?.toLowerCase() || ''
              if (!options.allowedFormats.includes(ext)) {
                console.warn(`Image format ${ext} not allowed`)
                continue
              }

              if (file.size > options.maxSize) {
                console.warn(`Image size ${file.size} exceeds max ${options.maxSize}`)
                continue
              }

              options.onUpload(file).then((result) => {
                if (result) {
                  view.dispatch(
                    view.state.tr.replaceSelectionWith(
                      view.state.schema.nodes.image.create({
                        src: result
                      })
                    )
                  )
                }
              })
            }

            return true
          }
        }
      })
    ]
  }
})

export async function uploadImageOriginal(
  file: File
): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target?.result as string
      if (!base64) {
        resolve(null)
        return
      }

      try {
        const result = await window.electron.image.uploadFromBase64(base64, {
          maxSize: 10 * 1024 * 1024,
          allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
          maxWidth: 4096,
          maxHeight: 4096,
          quality: 100
        })

        if (result) {
          const storedBase64 = await window.electron.image.readAsBase64(result.path)
          resolve(storedBase64)
        } else {
          resolve(base64)
        }
      } catch (error) {
        console.error('Failed to upload image:', error)
        resolve(base64)
      }
    }
    reader.onerror = () => {
      resolve(null)
    }
    reader.readAsDataURL(file)
  })
}

export default ImagePaste
