// lcdParts="arrange" / "slot" / "group" など <g> ベースオブジェクトの共通基底クラス
// LcdPartsObjを継承し、filter属性の分割描画サポートを提供する
// 分割描画: filterは内側の<g>に移し、lcd-noFilter子要素を外側<g>に直接配置してfilterを回避する
class GObj extends LcdPartsObj {
    // svgDom: 対応するDOM要素（ルートの場合は null 可）
    constructor(svgDom, drawParams, args, colorOverride = null) {
        super(svgDom, drawParams, args, colorOverride);
        // filter属性を保持（getElementでの分割描画に使用）
        this._filter = svgDom ? svgDom.getAttribute('filter') : null;
        // arrangeDirection: 0=SVG記述順（デフォルト）、1=逆順（getElement()での配置順を反転）
        const _ad = parseInt(svgDom ? svgDom.getAttribute('arrangeDirection') : '0');
        this.arrangeDirection = isNaN(_ad) ? 0 : _ad;
    }

    // 通常子要素を格納するための <g filter="..."> を生成する
    // filterがない場合はnullを返す（分割不要）
    _createFilteredG() {
        if (!this._filter) return null;
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('filter', this._filter);
        return g;
    }

    // filteredGをcontainerの先頭に挿入して分割描画を確定する
    // filteredGが空（子要素なし）の場合は挿入しない
    _finalizeFilterSplit(container, filteredG) {
        if (filteredG && filteredG.hasChildNodes()) {
            container.insertBefore(filteredG, container.firstChild);
        }
    }

    // filter持ちコンテナ用: this._filterがある場合のみnoFilterSink付きのchildCtxを生成する
    // sinkがnullの場合はfilterなし（変更不要）
    _openSink(ctx) {
        if (!this._filter) return { childCtx: ctx, sink: null };
        const sink = [];
        return { childCtx: { ...(ctx || {}), noFilterSink: sink }, sink };
    }

    // _openSinkで生成したsinkの要素をgに追加する（フィルター外配置）
    _closeSink(sink, g) {
        if (!sink) return;
        for (const el of sink) g.appendChild(el);
    }

    // 中間コンテナ（GroupObj）用: ctx.noFilterSinkをプロキシsinkで差し替えたchildCtxとflushProxyを返す
    // transformStrがある場合: proxySinkの要素をtransformラッパーで包んで親sinkへ転送する
    // transformStrがない、またはctx.noFilterSinkがない場合はctxをそのまま返す
    _proxyChildSink(ctx, transformStr) {
        if (!ctx || !ctx.noFilterSink) return { childCtx: ctx, flushProxy: null };
        if (!transformStr) return { childCtx: ctx, flushProxy: null };
        const parentSink = ctx.noFilterSink;
        const proxySink  = [];
        const flushProxy = () => {
            if (!proxySink.length) return;
            const w = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            w.setAttribute('transform', transformStr);
            for (const el of proxySink) w.appendChild(el);
            parentSink.push(w);
        };
        return { childCtx: { ...ctx, noFilterSink: proxySink }, flushProxy };
    }

    // 子要素の配置先を振り分ける（全GObj系getElement()の子ループ内で使用）
    // noFilter=true かつ noFilterSink あり → sinkへ push（祖先フィルター外へ浮き上がり）
    // noFilter=false かつ filteredG あり    → filteredGへ追加（フィルター適用）
    // それ以外                             → containerへ追加
    _placeChild(el, child, filteredG, container, childCtx) {
        if (child.noFilter && childCtx && childCtx.noFilterSink) {
            childCtx.noFilterSink.push(el);
        } else if (filteredG && !child.noFilter) {
            filteredG.appendChild(el);
        } else {
            container.appendChild(el);
        }
    }
}
