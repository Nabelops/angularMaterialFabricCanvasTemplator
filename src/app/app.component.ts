import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { fabric } from 'fabric'
import { map, tap } from 'rxjs';
import { divide, sortBy, sumBy } from 'lodash';
import { WebfontFamily, WebfontList } from './fonts.model';
import { googleFontKey } from './secrets';
import { ThemePalette } from '@angular/material/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Color } from '@angular-material-components/color-picker';
import { IText } from 'fabric/fabric-impl';
import * as Webfont from 'webfontloader';
import {jsPDF as JsPDF} from "jspdf";

@UntilDestroy()
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {
  @ViewChild('myCanvas') myCanvas!: ElementRef;
  canvas!: fabric.Canvas | undefined;
  cardForm = this.initForm();
  fonts$ = this.getFonts().pipe(tap(fonts => this.setDefaultFont(fonts)));
  isBadImport = false;
  isParsing = false;
  isSubmitting = false;
  file: File | undefined;
  color: ThemePalette = 'primary';
  textBoxes!: IText[];

  fillerText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit,' +
    'sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.' +
    ' Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris' +
    ' nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in ' +
    'reprehenderit in voluptate velit esse cill';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.fontColor.valueChanges.pipe(
      untilDestroyed(this),
      tap(color => this.changeColor(color))
    ).subscribe();
    this.fontFamily.valueChanges.pipe(
      untilDestroyed(this),
      tap(font => this.onSelectedFont(font))
    ).subscribe();
    this.fontSize.valueChanges.pipe(
      untilDestroyed(this),
      tap(size => this.changeSize(size))
    ).subscribe();
    this.includeToFrom.valueChanges.pipe(
      untilDestroyed(this),
      tap(include => this.onAddToFrom(include))
    ).subscribe();
  }

  ngAfterViewInit(): void {
    this.canvas = new fabric.Canvas(this.myCanvas.nativeElement);
    const fillerFab = new fabric.Textbox(this.fillerText, {
      width: 400,
      fontSize: this.fontSize.value,
      top: 200,
      left: 100,
      lockScalingY: true,
      textAlign: 'center'
    })
    this.textBoxes = [fillerFab]
    this.canvas.add(fillerFab);
  }
  
  align(cmd: string) {}

  process_align(val: string) {
    const activeObjs = this.canvas?.getActiveObjects()
    if (!activeObjs) return; 
    const firstObj = activeObjs[0];
    const firstObjCoords = firstObj.getCoords();
    switch (val) {
      case 'left':
        const left = firstObjCoords[0].x;
        activeObjs.forEach(activeObj => activeObj.set({left}));
        break;
      case 'right':
        const right = firstObjCoords[1].x;
        activeObjs.forEach(activeObj => activeObj.set({
          left: right - (activeObj.width || 0)
        }))
        break;
      case 'top':
        const top = firstObjCoords[0].y;
        activeObjs.forEach(activeObj => activeObj.set({top}));
        break;
      case 'bottom':
        const bottom = firstObjCoords[2].y;
        activeObjs.forEach(activeObj => activeObj.set({
          top: bottom - (activeObj.height || 0)
        }))
        break;
      case 'hoizontal-center':
        const vCenter = firstObj.getCenterPoint().x;
        activeObjs.forEach(activeObj => activeObj.set({
          left: vCenter - ((activeObj.width || 0) / 2)
        }))
        break;
      case 'vertical-center':
        const hCenter = firstObj.getCenterPoint().y;
        activeObjs.forEach(activeObj => activeObj.set({
          top: hCenter - ((activeObj.height || 0) / 2)
        }))
        break;
      case 'distribute-vertical':
        const selectionObj = this.canvas?.getActiveObject();
        if (!selectionObj) return
        const totalHeight = selectionObj.height || 0;
        const totalObjectHeight = sumBy(activeObjs, obj => obj.height || 0)
        const spacing = (totalHeight - totalObjectHeight) / (activeObjs.length - 1);
        const sortedObjects = sortBy(activeObjs, obj => obj.top);
        var previosObject = sortedObjects.shift();
        sortedObjects.pop();
        sortedObjects.forEach(activeObj => {
          activeObj.set({
            top: (previosObject?.top || 0) + (previosObject?.height || 0) + spacing
          });
          previosObject = activeObj;
        })
        break;
      case 'distribute-horizontal':
        const selectionObj2 = this.canvas?.getActiveObject();
        if (!selectionObj2) return
        const totalWidth = selectionObj2.width || 0;
        const totalObjectsWidth = sumBy(activeObjs, obj => obj.width || 0)
        const spacing2 = (totalWidth - totalObjectsWidth) / (activeObjs.length - 1);
        const sortedObjects2 = sortBy(activeObjs, obj => obj.left);
        var previosObject = sortedObjects2.shift();
        sortedObjects2.pop();
        sortedObjects2.forEach(activeObj => {
          activeObj.set({
            left: (previosObject?.left || 0) + (previosObject?.width || 0) + spacing2
          });
          previosObject = activeObj;
        })
        break;
      }
      this.canvas?.renderAll()
  }

  centerVerticalPage() {
    const activeObjs = this.canvas?.getActiveObject()
    if (!activeObjs) return
    activeObjs.centerV();
    this.canvas?.renderAll();
  }

  centerHorizontalPage() {
    const activeObjs = this.canvas?.getActiveObject()
    if (!activeObjs) return
    activeObjs.centerH();
    this.canvas?.renderAll();
  }

  onFileSelect(event: Event) {
    const element = event.target as HTMLInputElement;
    const files = element.files;
    if (files) {
      const file = files[0];
      const render = new FileReader();
      this.file = file
      render.readAsDataURL(file)
      render.onloadend = (e) => {
        if (render.result) {
          this.setImage(render.result as string)
        }
      }
    }
  }

  onDownload() {
    const demo = this.canvas?.toDataURL();
    if (!demo) return
    const doc = new JsPDF({
      orientation: "landscape",
      unit: "in",
      format: [6.18, 4.11],
    });
      // doc.addSvgAsImage(generated, 0, 0, 6.18, 4.11, "NONE");
    doc.addImage(demo, "PNG", 0, 0, 6.18, 4.11, "NONE");
    doc.save("demo.pdf");
  }

  fontCompare(o1: WebfontFamily, o2: WebfontFamily): boolean {
    return o1.family === o2.family;
  }
  
  onClearFile() {
    this.file = undefined;
    this.isParsing = false;
    const image = new fabric.Image('');
    this.canvas?.setBackgroundImage(image, () => this.canvas?.renderAll());
  }

  get fontSize() {
    return this.cardForm.get('fontSize') as FormControl;
  }

  get fontColor() {
    return this.cardForm.get('fontColor') as FormControl;
  }

  get fontFamily() {
    return this.cardForm.get('fontFamily') as FormControl;
  }

  get includeToFrom() {
    return this.cardForm.get('includeToFrom') as FormControl;
  }

  private onSelectedFont(fontFamily: WebfontFamily) {
    console.log(fontFamily)
    if (fontFamily) {
      Webfont.load({
        google: {
          families: [fontFamily.family]
        },
        active: () => this.setFont(fontFamily),
      })
    }
  }

  private setFont(fontFamily: WebfontFamily) {
    this.textBoxes?.forEach(text => {
      if (fontFamily) {
        text.fontFamily = fontFamily.family;
      }
    })
    this.canvas?.renderAll()
}

  private changeColor(color: Color) {
    console.log(color)
    this.textBoxes?.forEach(text => {
      text.set({fill: `#${color.hex}`})
    })
    this.canvas?.renderAll();
  }

  private changeSize(fontSize: number) {
    this.textBoxes?.forEach(text => {
      text.fontSize = fontSize;
    })
    this.canvas?.renderAll();
  }

  private setImage(url: string) {
    fabric.Image.fromURL(url, (img) => {
      img.crossOrigin = "anonymous";
      console.log(img.crossOrigin)
      const h = img.height || 0;
      const w = img.width || 0;
      const ratio = divide (w, h)
      console.log(ratio)
      if (!h || h < 1200 || !w || w < 1800 || ratio != 1.5) {
        this.isBadImport = true;
      }
      img.scaleToHeight(400);
      img.scaleToWidth(600);
      this.canvas?.setBackgroundImage(img, () => {
        console.log('here')
        this.canvas?.renderAll();
      })
    })
  }

  private onAddToFrom(include: boolean) {
    if (include) {
      const toText = new fabric.Textbox("To: Jane Doe", {
        width: 180,
        fontSize: this.fontSize.value,
        fontFamily: this.fontFamily.value.family,
        fill: this.fontColor.value,
        top: 100,
        left: 100,
        lockScalingY: true,
        textAlign: 'center'
      })
      const fromText = new fabric.Textbox("From: John Doe", {
        width: 180,
        fontSize: this.fontSize.value,
        fontFamily: this.fontFamily.value.family,
        fill: this.fontColor.value,
        top: 100,
        left: 300,
        lockScalingY: true,
        textAlign: 'center'
      })
      this.textBoxes.push(toText, fromText);
      this.canvas?.add(toText, fromText);
    } else if (this.textBoxes.length == 3) {
      this.canvas?.remove(this.textBoxes.pop()!, this.textBoxes.pop()!)
    }
    this.canvas?.renderAll();
  }

  private setDefaultFont(fonts: WebfontFamily[]) {
    if (!this.fontFamily.value) {
      const defaultFont = fonts.find(font => font.family == "Roboto");
      this.fontFamily.patchValue(defaultFont)
    }
  }


  private getFonts() {
    return this.http.get<WebfontList>(`https://www.googleapis.com/webfonts/v1/webfonts?key=${googleFontKey}&sort=alpha`).pipe(
      map(fonts => fonts.items)
    )
  }

  private initForm() {
    const color = new Color(0, 0, 0);
    return this.fb.group({
      fontSize: [16],
      fontFamily: [''],
      fontColor: [color],
      customer: ['',],
      template: [''],
      includeToFrom: [false],
      to: [''],
      from: [''],
      message: ['']
    })
  }
}
